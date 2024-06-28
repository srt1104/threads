"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import User from "../models/user.model";
import Thread from "../models/thread.model";
import Community from "../models/community.model";

interface ThreadParams {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

interface CommentParams {
  threadId: string;
  commentText: string;
  userId: string;
  path: string;
}

export async function createThread({
  text,
  author,
  communityId,
  path,
}: ThreadParams) {
  try {
    await connectToDB();

    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    );

    const createdThread = await Thread.create({
      text,
      author,
      community: communityIdObject,
    });

    // update user model
    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });

    if (communityIdObject) {
      // update community model
      await Community.findByIdAndUpdate(communityIdObject, {
        $push: { threads: createdThread._id },
      });
    }
  } catch (error: any) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }

  revalidatePath(path);
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  try {
    await connectToDB();

    // calculate the number of threads to skip
    const skipAmount = (pageNumber - 1) * pageSize;

    // fetch the threads that have no parents (top-level)
    const postsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(pageSize)
      .populate({ path: "author", model: User })
      .populate({ path: "community", model: Community })
      .populate({
        path: "children",
        populate: {
          path: "author",
          model: User,
          select: "_id name parentId image",
        },
      });

    const totalPostsCount = await Thread.countDocuments({
      parentId: { $in: [null, undefined] },
    });
    const posts = await postsQuery.exec();

    const isNext = totalPostsCount > skipAmount + posts.length;

    return { posts, isNext };
  } catch (error) {
    throw new Error("Failed to fetch posts");
  }
}

export async function fetchThreadById(id: string) {
  try {
    await connectToDB();

    const thread = await Thread.findById(id)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      })
      .populate({
        path: "community",
        model: Community,
      })
      .populate({
        path: "children",
        populate: [
          {
            path: "author",
            model: User,
            select: "_id id name parentId image",
          },
          {
            path: "children",
            model: Thread,
            populate: {
              path: "author",
              model: User,
              select: "_id id name parentId image",
            },
          },
        ],
      })
      .exec();

    return thread;
  } catch (error: any) {
    throw new Error(`Failed to fetch thread: ${error.message}`);
  }
}

export async function addCommentToThread({
  threadId,
  commentText,
  userId,
  path,
}: CommentParams) {
  try {
    await connectToDB();

    // find the original thread by its ID
    const originalThread = await Thread.findById(threadId);
    if (!originalThread) {
      throw new Error("Thread not found");
    }

    // create a new thread with the comment text
    const commentThread = new Thread({
      text: commentText,
      author: userId,
      parentId: threadId,
    });

    // save the new thread
    const savedCommentThread = await commentThread.save();

    // update the original thread to include the new comment
    originalThread.children.push(savedCommentThread._id);

    // save the original thread
    await originalThread.save();
  } catch (error: any) {
    throw new Error(`Error adding comment to thread: ${error.message}`);
  }

  revalidatePath(path);
}

async function fetchAllChildThreads(threadId: string): Promise<any[]> {
  const childThreads = await Thread.find({ parentId: threadId });

  const descendantThreads = [];
  for (const childThread of childThreads) {
    const descendants = await fetchAllChildThreads(childThread._id);
    descendantThreads.push(childThread, ...descendants);
  }

  return descendantThreads;
}

export async function deleteThread(id: string, path: string) {
  try {
    await connectToDB();

    // find the main thread to be deleted
    const mainThread = await Thread.findById(id).populate("author community");
    if (!mainThread) {
      throw new Error("Thread not found");
    }

    // fetch all child threads and their descendants recursively
    const descendantThreads = await fetchAllChildThreads(id);

    // get all descendant thread IDs including the main thread ID and child thread IDs
    const descendantThreadsIds = [
      id,
      ...descendantThreads.map((thread) => thread._id),
    ];

    // extract the authorIds and communityIds to update User and Community models respectively
    const uniqueAuthorIds = new Set(
      [
        ...descendantThreads.map(
          (thread) => thread.author?._id?.toString(),
          mainThread.author?._id?.toString()
        ),
      ].filter((id) => id !== undefined)
    );
    const uniqueCommunityIds = new Set(
      [
        ...descendantThreads.map((thread) => thread.community?._id?.toString()),
        mainThread.community?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    // delete main thread and its descendants
    await Thread.deleteMany({ _id: { $in: descendantThreadsIds } });

    // update User model
    await User.updateMany(
      { _id: { $in: Array.from(uniqueAuthorIds) } },
      { $pull: { threads: { $in: descendantThreadsIds } } }
    );

    // update Community model
    await Community.updateMany(
      { _id: { $in: Array.from(uniqueCommunityIds) } },
      { $pull: { threads: { $in: descendantThreadsIds } } }
    );
  } catch (error: any) {
    throw new Error(`Faild to delete thread: ${error.message}`);
  }

  revalidatePath(path);
}

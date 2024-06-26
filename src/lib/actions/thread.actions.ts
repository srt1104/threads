"use server";

import { revalidatePath } from "next/cache";
import Thread from "../models/thread.model";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";

interface ThreadParams {
  text: string;
  author: string;
  communityId: string | null;
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

    const createdThread = await Thread.create({
      text,
      author,
      community: null,
    });

    //   update user model
    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });
  } catch (error: any) {
    throw new Error(`Error creating thread: ${error.message}`);
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
      .populate({ path: "author", model: "User" })
      .populate({
        path: "children",
        populate: {
          path: "author",
          model: "User",
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
    throw new Error("Oops... Something went wrong.");
  }
}

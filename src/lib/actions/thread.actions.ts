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

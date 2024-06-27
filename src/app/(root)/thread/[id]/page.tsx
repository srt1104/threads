import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import Comment from "@/components/forms/Comment";
import ThreadCard from "@/components/cards/ThreadCard";
import { fetchUser } from "@/lib/actions/user.actions";
import { fetchThreadById } from "@/lib/actions/thread.actions";

export default async function ThreadDetails({
  params,
}: {
  params: { id: string };
}) {
  if (!params.id) {
    return null;
  }

  const user = await currentUser();
  if (!user) return null;

  const userInfo = await fetchUser(user.id);
  if (!userInfo.onboarded) redirect("onboarding");

  const thread = await fetchThreadById(params.id);

  return (
    <section className="relative">
      <div>
        <ThreadCard
          key={thread._id}
          id={thread._id}
          currentUserId={user!.id}
          parentId={thread.parentId}
          content={thread.text}
          author={thread.author}
          community={thread.community}
          createdAt={thread.createdAt}
          comments={thread.children}
        />
      </div>

      <div className="mt-7">
        <Comment
          threadId={thread.id}
          currentUserImg={userInfo.image}
          currentUserId={userInfo._id.toString()}
        />
      </div>

      <div className="mt-10">
        {thread.children.map((threadum: any) => (
          <ThreadCard
            key={threadum._id}
            id={threadum._id}
            currentUserId={user!.id}
            parentId={threadum.parentId}
            content={threadum.text}
            author={threadum.author}
            community={threadum.community}
            createdAt={threadum.createdAt}
            comments={threadum.children}
            isComment
          />
        ))}
      </div>
    </section>
  );
}

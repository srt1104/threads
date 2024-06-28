import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { fetchUser, getActivity } from "@/lib/actions/user.actions";

export default async function Activity() {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) {
    redirect("/onboarding");
  }

  const activity = await getActivity(userInfo._id);

  return (
    <section>
      <h1 className="head-text b-10">Activity</h1>

      <div className="mt-10 flex flex-col gap-5">
        {activity.length > 0 ? (
          <>
            {activity.map((activatum) => (
              <Link key={activatum._id} href={`/thread/${activatum.parentId}`}>
                <article className="activity-card">
                  <Image
                    src={activatum.author.image}
                    alt="Profile Picture"
                    width={20}
                    height={20}
                    className="rounded-full object-cover"
                  />
                  <p className="!text-small-regular text-light-1">
                    <span className="mr-1 text-primary-500">
                      {activatum.author.name}
                    </span>
                    &nbsp;replied to your thread
                  </p>
                </article>
              </Link>
            ))}
          </>
        ) : (
          <>
            <p className="!text-base-regular text-light-3">No activity yet</p>
          </>
        )}
      </div>
    </section>
  );
}

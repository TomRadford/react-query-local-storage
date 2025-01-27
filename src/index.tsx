import * as React from "react";
import ReactDOM from "react-dom/client";
import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

type Post = {
  id: number;
  title: string;
  body: string;
};

function usePosts() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: async (): Promise<Array<Post>> => {
      const response = localStorage.getItem("posts");
      if (!response) {
        // This will initialise "posts" in local storage
        // the first time this app runs in the user's browser ✨
        localStorage.setItem("posts", "[]");
        return [];
      } else {
        return await JSON.parse(response);
      }
    },
  });
}

function useAddPost() {
  return useMutation({
    mutationFn: async ({ newPost }: { newPost: Post }) => {
      const response = JSON.parse(
        localStorage.getItem("posts") ?? "[]"
      ) as Post[];
      response.push(newPost);
      localStorage.setItem("posts", JSON.stringify(response));
      return newPost;
    },
    onSuccess: (post) =>
      queryClient.setQueryData<Post[]>(["posts"], (posts) => [
        ...(posts ?? []),
        post,
      ]),
  });
}

function Posts({
  setPostId,
}: {
  setPostId: React.Dispatch<React.SetStateAction<number>>;
}) {
  const queryClient = useQueryClient();
  const { status, data, error, isFetching } = usePosts();
  const { mutate, isPending } = useAddPost();
  console.log(data);

  return (
    <div>
      <h1>Posts</h1>
      <div>
        {status === "pending" ? (
          "Loading..."
        ) : status === "error" ? (
          <span>Error: {error.message}</span>
        ) : (
          <>
            <div>
              {data.map((post) => (
                <p key={post.id}>
                  <a
                    onClick={(e) => {
                      // this is just a stub for react router
                      e.preventDefault();
                      setPostId(post.id);
                    }}
                    href="#"
                    style={
                      // We can access the query data here to show bold links for
                      // ones that are cached
                      queryClient.getQueryData(["post", post.id])
                        ? {
                            fontWeight: "bold",
                            color: "green",
                          }
                        : {}
                    }
                  >
                    {post.title}
                  </a>
                </p>
              ))}
            </div>
            <div>{isFetching ? "Background Updating..." : " "}</div>
          </>
        )}
        <button
          disabled={isPending}
          onClick={() => {
            const id = Math.trunc(Math.random() * 100000);
            mutate({
              newPost: {
                id: Math.trunc(Math.random() * 100000),
                title: `hello ${id}`,
                body: "yoo",
              },
            });
          }}
        >
          ANOTHA ONE
        </button>
      </div>
    </div>
  );
}

function usePost(postId: number) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      const response = localStorage.getItem("posts");
      if (!response) {
        throw new Error("No posts yet");
      } else {
        const posts = (await JSON.parse(response)) as Post[];
        return posts.find((post) => post.id === postId) as Post;
      }
    },
    enabled: !!postId,
  });
}

function Post({
  postId,
  setPostId,
}: {
  postId: number;
  setPostId: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { status, data, error, isFetching } = usePost(postId);

  return (
    <div>
      <div>
        <a
          onClick={(e) => {
            // This is just a stub for react router
            e.preventDefault();

            setPostId(-1);
          }}
          href="#"
        >
          Back
        </a>
      </div>
      {!postId || status === "pending" ? (
        "Loading..."
      ) : status === "error" ? (
        <span>Error: {error.message}</span>
      ) : (
        <>
          <h1>{data.title}</h1>
          <div>
            <p>{data.body}</p>
          </div>
          <div>{isFetching ? "Background Updating..." : " "}</div>
        </>
      )}
    </div>
  );
}

function App() {
  const [postId, setPostId] = React.useState(-1);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <p>
        This wraps local storage in tanstack query so that they persist on page
        reloads and dummy data can be mutable for testing purposes
      </p>
      {postId > -1 ? (
        <Post postId={postId} setPostId={setPostId} />
      ) : (
        <Posts setPostId={setPostId} />
      )}
      <ReactQueryDevtools initialIsOpen />
    </PersistQueryClientProvider>
  );
}

const rootElement = document.getElementById("root") as HTMLElement;
ReactDOM.createRoot(rootElement).render(<App />);

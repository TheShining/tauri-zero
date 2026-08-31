import { RouterProvider } from "react-router";
import { Suspense } from "react";
import { createAppRouter } from "./createAppRouter";

export default function AppRouter() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RouterProvider router={createAppRouter()} />
    </Suspense>
  );
}

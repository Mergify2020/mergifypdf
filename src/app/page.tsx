import { redirect } from "next/navigation";

export default function Page() {
  // Send the homepage straight to the Workbench
  redirect("/workbench");
}

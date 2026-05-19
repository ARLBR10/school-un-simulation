import { redirect } from "next/navigation";

export default function MisspelledSignUpPage() {
  redirect("/auth/sign-up");
}

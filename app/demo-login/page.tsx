import { redirect } from "next/navigation";
import DemoLoginForm from "@/components/demo-login-form";

export const metadata = {
  title: "Recruiter Demo Login | Blueprint to Live",
  description: "Sign in to explore the Blueprint to Live recruiter demo.",
};

export default function DemoLoginPage() {
  if (process.env.DEMO_MODE !== "true") {
    redirect("/");
  }

  return <DemoLoginForm />;
}

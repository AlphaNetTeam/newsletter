import { redirect } from "next/navigation";
import { DEFAULT_SYMBOL } from "@/lib/config";

export default function HomePage() {
  redirect(`/${DEFAULT_SYMBOL}`);
}

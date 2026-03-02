import { redirect } from "next/navigation";

export default function NewTripPage() {
  redirect("/operations/trips?new=1");
}

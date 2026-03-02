import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SalesDetailCompatibilityPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/commercial/sales-history/${id}`);
}

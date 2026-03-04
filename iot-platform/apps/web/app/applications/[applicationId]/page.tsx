import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default async function ApplicationDetailPage({ params }: Props) {
  const { applicationId } = await params;
  redirect(`/applications/${applicationId}/devices`);
}

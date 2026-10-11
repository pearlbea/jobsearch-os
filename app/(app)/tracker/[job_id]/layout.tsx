import BackToTrackerLink from "@/components/back-to-tracker-link";
import JobTabs from "@/components/job-tabs";

export default async function JobLayout({
  children,
  params,
}: LayoutProps<"/tracker/[job_id]">) {
  const { job_id } = await params;
  return (
    <>
      <BackToTrackerLink />
      <JobTabs jobId={job_id} />
      {children}
    </>
  );
}

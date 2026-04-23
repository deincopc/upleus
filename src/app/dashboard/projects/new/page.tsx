import Link from "next/link";
import { ProjectForm } from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
  return (
    <div>
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">New project</h1>
        <p className="text-sm text-gray-500 mt-1">
          Each project gets its own public status page you can share with that client.
        </p>
      </div>
      <ProjectForm />
    </div>
  );
}

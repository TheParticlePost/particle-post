import { OverlineLabel } from "@/components/ui/overline-label";
import { ProfileEditor } from "@/components/dashboard/profile-editor";

export default function DashboardProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <OverlineLabel>Profile Settings</OverlineLabel>
        <h1 className="font-display font-bold text-display-sm text-text-primary mt-2">
          Edit Your Profile
        </h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Changes will be reflected on your public profile immediately.
        </p>
      </div>
      <ProfileEditor />
    </div>
  );
}

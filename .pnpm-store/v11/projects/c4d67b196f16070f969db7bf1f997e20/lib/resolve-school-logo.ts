import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { updateSchoolLogoPath } from "@/repository/school";

type ResolvedSchoolLogo = {
  absolutePath: string;
  relativePath: string;
};

export async function resolveSchoolLogo(
  schoolId: string,
  logoPath: string,
) {
  const logo = await invoke<ResolvedSchoolLogo>("resolve_school_logo_path", {
    logoPath,
  });
  if (logo.relativePath !== logoPath) {
    await updateSchoolLogoPath(schoolId, logo.relativePath);
    window.dispatchEvent(new Event("scsms:feature-data-refresh"));
  }
  return convertFileSrc(logo.absolutePath);
}

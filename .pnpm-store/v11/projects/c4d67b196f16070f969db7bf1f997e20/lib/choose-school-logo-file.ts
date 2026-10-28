import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export async function chooseSchoolLogoFile() {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: "Image files",
        extensions: ["png", "jpg", "jpeg", "webp", "svg"],
      },
    ],
  });

  if (typeof selected !== "string") return null;

  return invoke<string>("store_school_logo", { sourcePath: selected });
}

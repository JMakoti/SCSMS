"use client";

export async function chooseSchoolLogoFile(): Promise<string | null> {
  const file = await new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".png,.jpg,.jpeg,.webp,.svg";
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener("cancel", () => resolve(null), { once: true });
    input.click();
  });
  if (!file) return null;
  if (file.size === 0 || file.size > 5 * 1024 * 1024) throw new Error("Choose a non-empty school logo up to 5 MB.");
  const response = await fetch("/api/files", { method: "POST", headers: { "x-file-extension": file.name.split(".").at(-1) ?? "" }, body: file });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "The logo could not be uploaded.");
  return payload.key as string;
}

export async function resolveSchoolLogo(_schoolId: string, key: string) {
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
}

import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import DocumentsPage from "../DocumentsPage";

export function mockLoggedInUser() {
  sessionStorage.setItem("user", JSON.stringify({ email: "test@example.com" }));
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    }),
  ) as unknown as typeof fetch;
}

export function renderDocumentsPage() {
  return render(
    <MemoryRouter>
      <DocumentsPage />
    </MemoryRouter>,
  );
}

// Shared helper: upload a file so tests that need an existing document
// (duplicate, archive, rename, version history) don't repeat this every time.
export async function uploadTestFile(
  screen: typeof import("@testing-library/react").screen,
  fireEvent: typeof import("@testing-library/react").fireEvent,
  fileName: string,
) {
  fireEvent.click(screen.getByText("Upload Document"));
  const fileInput = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const file = new File(["content"], fileName, { type: "application/pdf" });
  fireEvent.change(fileInput, { target: { files: [file] } });
  fireEvent.click(screen.getByText("Upload"));
  await screen.findByText(fileName);
}

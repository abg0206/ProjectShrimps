import { describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import {
  mockLoggedInUser,
  renderDocumentsPage,
  uploadTestFile,
} from "./testUtils";

beforeEach(() => {
  mockLoggedInUser();
});

describe("DocumentsPage - Version History", () => {
  it("expands to show version 1 after uploading", async () => {
    renderDocumentsPage();
    await uploadTestFile(screen, fireEvent, "draft.pdf");

    fireEvent.click(screen.getByText("Versions (1)"));

    expect(await screen.findByText(/v1 — Initial version/)).toBeInTheDocument();
  });
});

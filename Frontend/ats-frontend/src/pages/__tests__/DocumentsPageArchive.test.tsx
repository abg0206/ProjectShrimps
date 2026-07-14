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

describe("DocumentsPage - Archive/Unarchive", () => {
  it("toggles the Archive button to Unarchive when clicked", async () => {
    renderDocumentsPage();
    await uploadTestFile(screen, fireEvent, "portfolio.pdf");

    fireEvent.click(screen.getByText("Archive"));

    expect(await screen.findByText("Unarchive")).toBeInTheDocument();
  });
});

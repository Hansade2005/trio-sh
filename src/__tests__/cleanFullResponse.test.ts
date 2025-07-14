import { cleanFullResponse } from "@/ipc/utils/cleanFullResponse";
import { describe, it, expect } from "vitest";

describe("cleanFullResponse", () => {
  it("should replace < characters in triobuilder-write attributes", () => {
    const input = `<triobuilder-write path="src/file.tsx" description="Testing <a> tags.">content</triobuilder-write>`;
    const expected = `<triobuilder-write path="src/file.tsx" description="Testing ＜a＞ tags.">content</triobuilder-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should replace < characters in multiple attributes", () => {
    const input = `<triobuilder-write path="src/<component>.tsx" description="Testing <div> tags.">content</triobuilder-write>`;
    const expected = `<triobuilder-write path="src/＜component＞.tsx" description="Testing ＜div＞ tags.">content</triobuilder-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle multiple nested HTML tags in a single attribute", () => {
    const input = `<triobuilder-write path="src/file.tsx" description="Testing <div> and <span> and <a> tags.">content</triobuilder-write>`;
    const expected = `<triobuilder-write path="src/file.tsx" description="Testing ＜div＞ and ＜span＞ and ＜a＞ tags.">content</triobuilder-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle complex example with mixed content", () => {
    const input = `
      BEFORE TAG
  <triobuilder-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use <a> tags.">
import React from 'react';
</triobuilder-write>
AFTER TAG
    `;

    const expected = `
      BEFORE TAG
  <triobuilder-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use ＜a＞ tags.">
import React from 'react';
</triobuilder-write>
AFTER TAG
    `;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle other triobuilder tag types", () => {
    const input = `<triobuilder-rename from="src/<old>.tsx" to="src/<new>.tsx"></triobuilder-rename>`;
    const expected = `<triobuilder-rename from="src/＜old＞.tsx" to="src/＜new＞.tsx"></triobuilder-rename>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle triobuilder-delete tags", () => {
    const input = `<triobuilder-delete path="src/<component>.tsx"></triobuilder-delete>`;
    const expected = `<triobuilder-delete path="src/＜component＞.tsx"></triobuilder-delete>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should not affect content outside triobuilder tags", () => {
    const input = `Some text with <regular> HTML tags. <triobuilder-write path="test.tsx" description="With <nested> tags.">content</triobuilder-write> More <html> here.`;
    const expected = `Some text with <regular> HTML tags. <triobuilder-write path="test.tsx" description="With ＜nested＞ tags.">content</triobuilder-write> More <html> here.`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle empty attributes", () => {
    const input = `<triobuilder-write path="src/file.tsx">content</triobuilder-write>`;
    const expected = `<triobuilder-write path="src/file.tsx">content</triobuilder-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle attributes without < characters", () => {
    const input = `<triobuilder-write path="src/file.tsx" description="Normal description">content</triobuilder-write>`;
    const expected = `<triobuilder-write path="src/file.tsx" description="Normal description">content</triobuilder-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });
});

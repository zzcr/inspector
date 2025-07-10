import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, beforeEach } from "@jest/globals";
import ToolResults from "../ToolResults";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { cacheToolOutputSchemas } from "@/utils/schemaUtils";

describe("ToolResults", () => {
  const mockTool: Tool = {
    name: "testTool",
    description: "Test tool",
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: {
      type: "object",
      properties: {
        result: { type: "string" },
      },
      required: ["result"],
    },
  };

  beforeEach(() => {
    cacheToolOutputSchemas([mockTool]);
  });

  describe("Content Compatibility Validation", () => {
    it("should accept single text block with matching JSON", () => {
      const toolResult = {
        content: [{ type: "text", text: '{"result": "success"}' }],
        structuredContent: { result: "success" },
      };

      render(<ToolResults toolResult={toolResult} selectedTool={mockTool} />);

      expect(screen.getByText(/Found matching JSON content.*in single text block/)).toBeInTheDocument();
    });

    it("should accept multiple text blocks with one matching JSON", () => {
      const toolResult = {
        content: [
          { type: "text", text: "Processing..." },
          { type: "text", text: '{"result": "success"}' },
          { type: "text", text: "Done!" },
        ],
        structuredContent: { result: "success" },
      };

      render(<ToolResults toolResult={toolResult} selectedTool={mockTool} />);

      expect(screen.getByText(/Found matching JSON content.*among multiple text blocks/)).toBeInTheDocument();
    });

    it("should accept mixed content types with matching JSON", () => {
      const toolResult = {
        content: [
          { type: "text", text: "Result:" },
          { type: "text", text: '{"result": "success"}' },
          { type: "image", data: "base64data", mimeType: "image/png" },
          { type: "resource", resource: { uri: "file://test.txt" } },
        ],
        structuredContent: { result: "success" },
      };

      render(<ToolResults toolResult={toolResult} selectedTool={mockTool} />);

      expect(screen.getByText(/Found matching JSON content.*with additional content blocks/)).toBeInTheDocument();
    });

    it("should reject when no text blocks are present", () => {
      const toolResult = {
        content: [
          { type: "image", data: "base64data", mimeType: "image/png" },
        ],
        structuredContent: { result: "success" },
      };

      render(<ToolResults toolResult={toolResult} selectedTool={mockTool} />);

      expect(screen.getByText(/No text content blocks found to match structured content/)).toBeInTheDocument();
    });

    it("should reject when no text blocks contain matching JSON", () => {
      const toolResult = {
        content: [
          { type: "text", text: "Some text" },
          { type: "text", text: '{"different": "data"}' },
        ],
        structuredContent: { result: "success" },
      };

      render(<ToolResults toolResult={toolResult} selectedTool={mockTool} />);

      expect(screen.getByText(/No text content block contains JSON matching structured content/)).toBeInTheDocument();
    });

    it("should reject when text blocks contain invalid JSON", () => {
      const toolResult = {
        content: [
          { type: "text", text: "Not JSON" },
          { type: "text", text: '{"invalid": json}' },
        ],
        structuredContent: { result: "success" },
      };

      render(<ToolResults toolResult={toolResult} selectedTool={mockTool} />);

      expect(screen.getByText(/No text content block contains JSON matching structured content/)).toBeInTheDocument();
    });

    it("should handle empty text blocks gracefully", () => {
      const toolResult = {
        content: [
          { type: "text", text: "" },
          { type: "text", text: '{"result": "success"}' },
        ],
        structuredContent: { result: "success" },
      };

      render(<ToolResults toolResult={toolResult} selectedTool={mockTool} />);

      expect(screen.getByText(/Found matching JSON content.*among multiple text blocks/)).toBeInTheDocument();
    });

    it("should not show compatibility check when tool has no output schema", () => {
      const toolWithoutSchema: Tool = {
        name: "noSchemaTool",
        description: "Tool without schema",
        inputSchema: {
          type: "object",
          properties: {},
        },
      };

      const toolResult = {
        content: [{ type: "text", text: '{"any": "data"}' }],
        structuredContent: { any: "data" },
      };

      render(<ToolResults toolResult={toolResult} selectedTool={toolWithoutSchema} />);

      // Should not show any compatibility messages
      expect(screen.queryByText(/Found matching JSON content/)).not.toBeInTheDocument();
      expect(screen.queryByText(/No text content blocks found/)).not.toBeInTheDocument();
      expect(screen.queryByText(/No text content block contains JSON/)).not.toBeInTheDocument();
    });
  });

  describe("Structured Content Validation", () => {
    it("should show validation success for valid structured content", () => {
      const toolResult = {
        content: [],
        structuredContent: { result: "success" },
      };

      render(<ToolResults toolResult={toolResult} selectedTool={mockTool} />);

      expect(screen.getByText(/Valid according to output schema/)).toBeInTheDocument();
    });

    it("should show validation error for invalid structured content", () => {
      const toolResult = {
        content: [],
        structuredContent: { result: 123 }, // Should be string
      };

      render(<ToolResults toolResult={toolResult} selectedTool={mockTool} />);

      expect(screen.getByText(/Validation Error:/)).toBeInTheDocument();
    });

    it("should show error when structured content is missing for tool with output schema", () => {
      const toolResult = {
        content: [{ type: "text", text: "Some result" }],
        // No structuredContent
      };

      render(<ToolResults toolResult={toolResult} selectedTool={mockTool} />);

      expect(screen.getByText(/Tool has an output schema but did not return structured content/)).toBeInTheDocument();
    });
  });
});
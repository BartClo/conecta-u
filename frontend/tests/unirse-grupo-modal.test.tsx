import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnirseGrupoModal } from "../components/grupos/unirse-grupo-modal";

function submit(codigo: string) {
  fireEvent.change(screen.getByLabelText(/c.digo/i), {
    target: { value: codigo },
  });
  fireEvent.click(screen.getByRole("button", { name: /^unirse$/i }));
}

describe("UnirseGrupoModal", () => {
  it("uppercases the code and submits it", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<UnirseGrupoModal onSubmit={onSubmit} onClose={vi.fn()} />);

    submit("abc234");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("ABC234"));
  });

  it("does not submit an empty code", () => {
    const onSubmit = vi.fn();
    render(<UnirseGrupoModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /^unirse$/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ["API request failed: 404", /inv.lido o inexistente/i],
    ["API request failed: 409", /ya eres miembro/i],
    ["API request failed: 500", /API request failed: 500/],
  ])("shows a message for %s", async (message, expected) => {
    const onSubmit = vi.fn().mockRejectedValue(new Error(message));
    render(<UnirseGrupoModal onSubmit={onSubmit} onClose={vi.fn()} />);

    submit("ZZZZZZ");

    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^unirse$/i })).toBeEnabled();
  });

  it("falls back to a generic message for non-Error rejections", async () => {
    const onSubmit = vi.fn().mockRejectedValue("boom");
    render(<UnirseGrupoModal onSubmit={onSubmit} onClose={vi.fn()} />);

    submit("ZZZZZZ");

    expect(await screen.findByText(/no se pudo unir/i)).toBeInTheDocument();
  });

  it("disables submit while pending and closes on cancel", () => {
    const onClose = vi.fn();
    render(
      <UnirseGrupoModal
        onSubmit={() => new Promise(() => {})}
        onClose={onClose}
      />,
    );

    submit("ABC234");
    expect(screen.getByRole("button", { name: /uni.ndose/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

import { describe, expect, test } from "bun:test";
import { buildChatWindow, chatDailyLimit, type ChatTurn } from "./chat-core";

describe("chatDailyLimit", () => {
  test("defaults to 30 and rejects invalid values", () => {
    expect(chatDailyLimit({})).toBe(30);
    expect(chatDailyLimit({ MERCURY_CHAT_DAILY_LIMIT: "abc" })).toBe(30);
    expect(chatDailyLimit({ MERCURY_CHAT_DAILY_LIMIT: "0" })).toBe(30);
    expect(chatDailyLimit({ MERCURY_CHAT_DAILY_LIMIT: "-5" })).toBe(30);
  });

  test("honors a configured positive integer", () => {
    expect(chatDailyLimit({ MERCURY_CHAT_DAILY_LIMIT: "5" })).toBe(5);
  });
});

describe("buildChatWindow", () => {
  const turn = (role: ChatTurn["role"], i: number): ChatTurn => ({ role, content: `m${i}` });

  test("appends the new user message to the chronological history", () => {
    const window = buildChatWindow([turn("user", 1), turn("assistant", 2)], "hello");
    expect(window).toHaveLength(3);
    expect(window.at(-1)).toEqual({ role: "user", content: "hello" });
  });

  test("trims to the max and never starts with an assistant turn", () => {
    const history: ChatTurn[] = [];
    for (let i = 0; i < 10; i++) {
      history.push(turn("user", i * 2), turn("assistant", i * 2 + 1));
    }
    const window = buildChatWindow(history, "next", 6);
    expect(window.length).toBeLessThanOrEqual(6);
    expect(window[0].role).toBe("user");
    expect(window.at(-1)?.content).toBe("next");
  });
});

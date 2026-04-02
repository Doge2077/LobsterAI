import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('./claudeSettings', () => ({
  resolveCurrentApiConfig: () => ({
    config: {
      apiKey: 'test-key',
      baseURL: 'https://example.com',
      model: 'test-model',
    },
  }),
}));

describe('coworkMemoryJudge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  test('evicts least recently used llm cache entry instead of oldest inserted entry', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [{ text: '{"accepted":true,"confidence":0.91,"reason":"stable"}' }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { judgeMemoryCandidate } = await import('./coworkMemoryJudge');

    const buildInput = (index: number) => ({
      text: `my name is cache-user-${index}`,
      isExplicit: false,
      guardLevel: 'strict' as const,
      llmEnabled: true,
    });

    for (let index = 0; index < 256; index += 1) {
      await judgeMemoryCandidate(buildInput(index));
    }

    expect(fetchMock).toHaveBeenCalledTimes(256);

    await judgeMemoryCandidate(buildInput(0));
    expect(fetchMock).toHaveBeenCalledTimes(256);

    await judgeMemoryCandidate(buildInput(256));
    expect(fetchMock).toHaveBeenCalledTimes(257);

    await judgeMemoryCandidate(buildInput(0));
    expect(fetchMock).toHaveBeenCalledTimes(257);

    await judgeMemoryCandidate(buildInput(1));
    expect(fetchMock).toHaveBeenCalledTimes(258);
  });
});

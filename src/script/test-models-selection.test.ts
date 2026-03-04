import { describe, expect, it } from "vitest"

import {
  selectModelTests,
  type ModelCategory,
  type ModelTest,
} from "../../script/test-models.ts"

const BASE_MODELS: ModelTest[] = [
  { model: "google/gemini-3-flash-preview", category: "gemini-cli" },
  { model: "google/antigravity-gemini-3.1-pro-low", category: "antigravity-gemini" },
]

describe("selectModelTests", () => {
  it("returns matching configured model when filter exists", () => {
    const tests = selectModelTests(BASE_MODELS, {
      filterModel: "google/gemini-3-flash-preview",
      filterCategory: null,
    })

    expect(tests).toEqual([
      { model: "google/gemini-3-flash-preview", category: "gemini-cli" },
    ])
  })

  it("matches configured model by suffix", () => {
    const tests = selectModelTests(BASE_MODELS, {
      filterModel: "gemini-3-flash-preview",
      filterCategory: null,
    })

    expect(tests).toEqual([
      { model: "google/gemini-3-flash-preview", category: "gemini-cli" },
    ])
  })

  it("falls back to ad-hoc model when name is not in configured list", () => {
    const tests = selectModelTests(BASE_MODELS, {
      filterModel: "gemini-nonexistent-image-model",
      filterCategory: null,
    })

    expect(tests).toEqual([
      { model: "gemini-nonexistent-image-model", category: "custom" },
    ])
  })

  it("keeps ad-hoc model when category filter is custom", () => {
    const tests = selectModelTests(BASE_MODELS, {
      filterModel: "gemini-nonexistent-image-model",
      filterCategory: "custom",
    })

    expect(tests).toEqual([
      { model: "gemini-nonexistent-image-model", category: "custom" },
    ])
  })

  it("returns empty when category excludes ad-hoc model", () => {
    const tests = selectModelTests(BASE_MODELS, {
      filterModel: "gemini-nonexistent-image-model",
      filterCategory: "gemini-cli",
    })

    expect(tests).toEqual([])
  })

  it("filters configured list by category without model filter", () => {
    const tests = selectModelTests(BASE_MODELS, {
      filterModel: null,
      filterCategory: "antigravity-gemini",
    })

    expect(tests).toEqual([
      { model: "google/antigravity-gemini-3.1-pro-low", category: "antigravity-gemini" },
    ])
  })
})

const _categoryTypeCheck: ModelCategory = "custom"
void _categoryTypeCheck

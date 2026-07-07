/**
 * Characterization tests for the shared ADF utilities.
 *
 * These tests lock in the CURRENT behavior of the jiraAdf barrel, including
 * quirks (arrays passing the record guard, `2)` markers rewritten to `2.`,
 * etc.). They intentionally do not assert what the code "should" do.
 */
import type { JiraAdfDocument, JiraAdfNode } from '~/shared/jiraAdf'
import { describe, expect, it } from 'vitest'
import {
  adfToPlainText,
  coerceDescriptionToAdf,
  isJiraAdfDocument,
  isJiraAdfNode,
  normalizeAdf,
  parseStringifiedAdf,
  plainTextToAdf,
} from '~/shared/jiraAdf'

function paragraph(text: string): JiraAdfNode {
  return { type: 'paragraph', content: [{ type: 'text', text }] }
}

function listItem(text: string): JiraAdfNode {
  return { type: 'listItem', content: [paragraph(text)] }
}

function doc(...content: JiraAdfNode[]): JiraAdfDocument {
  return { type: 'doc', version: 1, content }
}

describe('isJiraAdfDocument', () => {
  it('accepts a doc with numeric version and array content', () => {
    expect(isJiraAdfDocument({ type: 'doc', version: 1, content: [] })).toBe(true)
    expect(isJiraAdfDocument(doc(paragraph('x')))).toBe(true)
  })

  it('rejects missing/wrong version, wrong type, non-array content, and non-records', () => {
    expect(isJiraAdfDocument({ type: 'doc', content: [] })).toBe(false)
    expect(isJiraAdfDocument({ type: 'doc', version: '1', content: [] })).toBe(false)
    expect(isJiraAdfDocument({ type: 'paragraph', version: 1, content: [] })).toBe(false)
    expect(isJiraAdfDocument({ type: 'doc', version: 1, content: {} })).toBe(false)
    expect(isJiraAdfDocument(null)).toBe(false)
    expect(isJiraAdfDocument('doc')).toBe(false)
    expect(isJiraAdfDocument([])).toBe(false)
  })
})

describe('isJiraAdfNode', () => {
  it('accepts nodes with a missing type (every field is optional)', () => {
    expect(isJiraAdfNode({})).toBe(true)
    expect(isJiraAdfNode({ type: 'paragraph' })).toBe(true)
    expect(isJiraAdfNode({ text: 'plain' })).toBe(true)
  })

  it('accepts empty arrays because the record guard treats arrays as records (quirk)', () => {
    expect(isJiraAdfNode([])).toBe(true)
    // Same quirk: an array as attrs passes the record check.
    expect(isJiraAdfNode({ type: 'paragraph', attrs: [] })).toBe(true)
  })

  it('rejects non-records and wrong-typed fields', () => {
    expect(isJiraAdfNode(null)).toBe(false)
    expect(isJiraAdfNode('text')).toBe(false)
    expect(isJiraAdfNode(42)).toBe(false)
    expect(isJiraAdfNode({ type: 1 })).toBe(false)
    expect(isJiraAdfNode({ text: 5 })).toBe(false)
    expect(isJiraAdfNode({ attrs: 'x' })).toBe(false)
  })

  it('validates marks and content recursively', () => {
    expect(isJiraAdfNode({ type: 'text', text: 'x', marks: [{}] })).toBe(true)
    expect(isJiraAdfNode({ type: 'text', text: 'x', marks: [{ type: 'strong', attrs: {} }] })).toBe(true)
    expect(isJiraAdfNode({ type: 'text', text: 'x', marks: [{ type: 1 }] })).toBe(false)
    expect(isJiraAdfNode({ type: 'text', text: 'x', marks: [{ attrs: null }] })).toBe(false)
    expect(isJiraAdfNode({ type: 'text', text: 'x', marks: {} })).toBe(false)
    expect(isJiraAdfNode({ type: 'paragraph', content: [{ type: 5 }] })).toBe(false)
    expect(isJiraAdfNode({ type: 'paragraph', content: {} })).toBe(false)
  })
})

describe('plainTextToAdf', () => {
  it('returns null for empty or whitespace-only input', () => {
    expect(plainTextToAdf('')).toBeNull()
    expect(plainTextToAdf('  \n\t ')).toBeNull()
  })

  it('builds a single paragraph for a plain line', () => {
    expect(plainTextToAdf('hello world')).toEqual(doc(paragraph('hello world')))
  })

  it('keeps blank lines as empty paragraphs', () => {
    expect(plainTextToAdf('a\n\nb')).toEqual(doc(
      paragraph('a'),
      { type: 'paragraph', content: [] },
      paragraph('b'),
    ))
  })

  it('turns URLs into link marks and **bold** into strong marks inline', () => {
    expect(plainTextToAdf('see https://a.dev/x and **bold**')).toEqual(doc({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'see ' },
        {
          type: 'text',
          text: 'https://a.dev/x',
          marks: [{ type: 'link', attrs: { href: 'https://a.dev/x' } }],
        },
        { type: 'text', text: ' and ' },
        { type: 'text', text: 'bold', marks: [{ type: 'strong' }] },
      ],
    }))
  })

  it('groups -, * and • markers into one bulletList', () => {
    expect(plainTextToAdf('- one\n* two\n• three')).toEqual(doc({
      type: 'bulletList',
      content: [listItem('one'), listItem('two'), listItem('three')],
    }))
  })

  it('requires whitespace after the bullet marker', () => {
    expect(plainTextToAdf('-tight')).toEqual(doc(paragraph('-tight')))
  })

  it('groups 1. and 1) markers into one orderedList without attrs when starting at 1', () => {
    expect(plainTextToAdf('1. first\n2) second')).toEqual(doc({
      type: 'orderedList',
      content: [listItem('first'), listItem('second')],
    }))
  })

  it('records the start as attrs.order when the list starts above 1', () => {
    expect(plainTextToAdf('3) third\n4. fourth')).toEqual(doc({
      type: 'orderedList',
      attrs: { order: 3 },
      content: [listItem('third'), listItem('fourth')],
    }))
  })

  it('handles mixed paragraphs and lists', () => {
    expect(plainTextToAdf('Intro line\n- alpha\n- beta\n1. one\n2) two\ntail')).toEqual(doc(
      paragraph('Intro line'),
      { type: 'bulletList', content: [listItem('alpha'), listItem('beta')] },
      { type: 'orderedList', content: [listItem('one'), listItem('two')] },
      paragraph('tail'),
    ))
  })
})

describe('adfToPlainText round-trips of plainTextToAdf output', () => {
  it('round-trips a single paragraph', () => {
    expect(adfToPlainText(plainTextToAdf('hello world'))).toBe('hello world')
  })

  it('round-trips blank lines between paragraphs', () => {
    expect(adfToPlainText(plainTextToAdf('a\n\nb'))).toBe('a\n\nb')
  })

  it('rewrites all bullet markers to • and 2) to 2. (asymmetry)', () => {
    expect(adfToPlainText(plainTextToAdf('- alpha\n* beta\n• gamma'))).toBe('• alpha\n• beta\n• gamma')
    expect(adfToPlainText(plainTextToAdf('1. first\n2) second'))).toBe('1. first\n2. second')
  })

  it('resumes numbering from attrs.order', () => {
    expect(adfToPlainText(plainTextToAdf('3) third\n4. fourth'))).toBe('3. third\n4. fourth')
  })

  it('round-trips mixed content', () => {
    expect(adfToPlainText(plainTextToAdf('Intro line\n- alpha\n- beta\n1. one\n2) two\ntail')))
      .toBe('Intro line\n• alpha\n• beta\n1. one\n2. two\ntail')
  })

  it('returns an empty string for null docs', () => {
    expect(adfToPlainText(null)).toBe('')
    expect(adfToPlainText(undefined)).toBe('')
  })
})

describe('normalizeAdf', () => {
  it('strips editor-only attrs, empty text nodes, mark attrs, and clamps heading levels', () => {
    const input: JiraAdfDocument = {
      type: 'doc',
      version: 3,
      content: [
        {
          type: 'paragraph',
          attrs: { localId: 'editor-only' },
          content: [
            { type: 'text', text: 'Hi ' },
            { type: 'text', text: 'there', marks: [{ type: 'strong', attrs: { junk: true } }] },
            { type: 'text', text: '' },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 9, localId: 'y' },
          content: [{ type: 'text', text: 'H' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'link',
              marks: [{ type: 'link', attrs: { href: 'https://x.dev', title: 'dropped' } }],
            },
          ],
        },
        { type: 'hardBreak', attrs: { junk: 1 } },
        {
          type: 'panel',
          attrs: { panelType: 'info', src: 'dropped', callback: () => {} },
          content: [paragraph('inside')],
        },
      ],
    }

    expect(normalizeAdf(input)).toEqual({
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hi ' },
            { type: 'text', text: 'there', marks: [{ type: 'strong' }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'H' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'link', marks: [{ type: 'link', attrs: { href: 'https://x.dev' } }] },
          ],
        },
        { type: 'hardBreak' },
        {
          type: 'panel',
          attrs: { panelType: 'info' },
          content: [paragraph('inside')],
        },
      ],
    })
  })

  it('drops orderedList attrs.order when it is not > 0', () => {
    const list = (order: number): JiraAdfDocument => doc({
      type: 'orderedList',
      attrs: { order },
      content: [listItem('x')],
    })

    expect(normalizeAdf(list(0))?.content[0]).toEqual({
      type: 'orderedList',
      content: [listItem('x')],
    })
    expect(normalizeAdf(list(3))?.content[0]).toEqual({
      type: 'orderedList',
      attrs: { order: 3 },
      content: [listItem('x')],
    })
  })

  it('returns null for null docs and docs that normalize to no content', () => {
    expect(normalizeAdf(null)).toBeNull()
    expect(normalizeAdf(doc())).toBeNull()
    expect(normalizeAdf(doc({ type: 'text', text: '' }))).toBeNull()
  })

  it('re-parses a single unmarked paragraph containing newlines through plainTextToAdf (quirk)', () => {
    const input = doc({
      type: 'paragraph',
      content: [{ type: 'text', text: 'first\nsecond' }],
    })

    expect(normalizeAdf(input)).toEqual(doc(paragraph('first'), paragraph('second')))
  })
})

describe('parseStringifiedAdf', () => {
  it('parses a stringified doc, tolerating surrounding whitespace', () => {
    const source = doc(paragraph('hello'))

    expect(parseStringifiedAdf(JSON.stringify(source))).toEqual(source)
    expect(parseStringifiedAdf(`  ${JSON.stringify(source)}\n`)).toEqual(source)
  })

  it('returns null for non-JSON, non-object JSON, invalid JSON, and non-doc JSON', () => {
    expect(parseStringifiedAdf('plain text')).toBeNull()
    expect(parseStringifiedAdf('[{"type":"doc","version":1,"content":[]}]')).toBeNull()
    expect(parseStringifiedAdf('{broken json}')).toBeNull()
    expect(parseStringifiedAdf('{"unterminated"')).toBeNull()
    expect(parseStringifiedAdf('{"type":"doc","content":[]}')).toBeNull()
    expect(parseStringifiedAdf('{"type":"paragraph","version":1,"content":[]}')).toBeNull()
  })
})

describe('coerceDescriptionToAdf', () => {
  it('prefers a valid descriptionAdf and normalizes it, ignoring the description string', () => {
    const adf = doc({
      type: 'paragraph',
      attrs: { localId: 'x' },
      content: [{ type: 'text', text: 'from adf' }],
    })

    expect(coerceDescriptionToAdf('ignored plain text', adf)).toEqual(doc(paragraph('from adf')))
  })

  it('parses a stringified ADF description and normalizes it', () => {
    const source = doc(paragraph('stringified'))

    expect(coerceDescriptionToAdf(JSON.stringify(source), undefined)).toEqual(source)
  })

  it('builds ADF from a plain-text description', () => {
    expect(coerceDescriptionToAdf('line\n- item', undefined)).toEqual(doc(
      paragraph('line'),
      { type: 'bulletList', content: [listItem('item')] },
    ))
  })

  it('treats braces-wrapped garbage as plain text (quirk)', () => {
    expect(coerceDescriptionToAdf('{not valid json}', undefined))
      .toEqual(doc(paragraph('{not valid json}')))
  })

  it('returns null for empty inputs', () => {
    expect(coerceDescriptionToAdf(undefined, undefined)).toBeNull()
    expect(coerceDescriptionToAdf('', undefined)).toBeNull()
  })
})

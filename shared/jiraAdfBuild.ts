import type { JiraAdfDocument, JiraAdfMark, JiraAdfNode } from './jiraAdfTypes'

function buildTextNode(text: string): JiraAdfNode {
  return {
    type: 'text',
    text,
  }
}

function buildMarkedTextNode(text: string, marks: JiraAdfMark[]): JiraAdfNode {
  if (!marks.length) {
    return buildTextNode(text)
  }

  return {
    type: 'text',
    text,
    marks,
  }
}

function buildInlineContent(text: string): JiraAdfNode[] {
  const content: JiraAdfNode[] = []
  const inlinePattern = /https?:\/\/\S+|\*\*([^*\n]+)\*\*/g
  let lastIndex = 0

  for (const match of text.matchAll(inlinePattern)) {
    const matchedText = match[0]
    const matchIndex = match.index ?? 0

    if (matchIndex > lastIndex) {
      content.push(buildTextNode(text.slice(lastIndex, matchIndex)))
    }

    if (matchedText.startsWith('http://') || matchedText.startsWith('https://')) {
      content.push(buildMarkedTextNode(matchedText, [
        {
          type: 'link',
          attrs: {
            href: matchedText,
          },
        },
      ]))
    }
    else {
      const boldText = match[1]
      if (typeof boldText === 'string' && boldText.length > 0) {
        content.push(buildMarkedTextNode(boldText, [{ type: 'strong' }]))
      }
    }

    lastIndex = matchIndex + matchedText.length
  }

  if (lastIndex < text.length) {
    content.push(buildTextNode(text.slice(lastIndex)))
  }

  return content
}

function buildParagraph(text: string): JiraAdfNode {
  if (!text) {
    return {
      type: 'paragraph',
      content: [],
    }
  }

  return {
    type: 'paragraph',
    content: buildInlineContent(text),
  }
}

function buildListItem(text: string): JiraAdfNode {
  return {
    type: 'listItem',
    content: [buildParagraph(text)],
  }
}

function buildHeading(text: string, level: number): JiraAdfNode {
  return {
    type: 'heading',
    attrs: { level },
    content: buildInlineContent(text),
  }
}

function parseBulletText(line: string): string | null {
  const trimmedStart = line.trimStart()
  const firstChar = trimmedStart[0]
  if (firstChar === undefined || !'-*•'.includes(firstChar))
    return null

  const text = trimmedStart.slice(1)
  const trimmedText = text.trimStart()
  return trimmedText.length === text.length ? null : trimmedText
}

function parseOrderedText(line: string): { start: number, text: string } | null {
  const trimmedStart = line.trimStart()
  const markerMatch = trimmedStart.match(/^(\d+)[.)](.*)$/)
  if (!markerMatch)
    return null

  const [, startDigits, text] = markerMatch
  if (startDigits === undefined || text === undefined)
    return null

  const trimmedText = text.trimStart()
  if (trimmedText.length === text.length)
    return null

  return {
    start: Number.parseInt(startDigits, 10),
    text: trimmedText,
  }
}

export function plainTextToAdf(text: string): JiraAdfDocument | null {
  const normalizedText = text.replace(/\r\n/g, '\n')
  if (!normalizedText.trim())
    return null

  const lines = normalizedText.split('\n')
  const content: JiraAdfNode[] = []

  for (let index = 0; index < lines.length;) {
    const line = lines[index]
    if (line === undefined)
      break
    const trimmedLine = line.trim()
    const headingLevel = trimmedLine.startsWith('### ')
      ? 3
      : trimmedLine.startsWith('## ')
        ? 2
        : trimmedLine.startsWith('# ')
          ? 1
          : null

    if (headingLevel !== null) {
      content.push(buildHeading(trimmedLine.slice(headingLevel + 1).trim(), headingLevel))
      index += 1
      continue
    }

    const underlineLine = lines[index + 1]
    const setextHeadingMatch = underlineLine?.trim().match(/^([=-])\1{2,}$/)
    if (setextHeadingMatch && line.trim()) {
      const level = setextHeadingMatch[1] === '=' ? 1 : 2
      content.push(buildHeading(line.trim(), level))
      index += 2
      continue
    }

    const bulletText = parseBulletText(line)

    if (bulletText !== null) {
      const items: JiraAdfNode[] = []
      while (index < lines.length) {
        const currentLine = lines[index]
        if (currentLine === undefined)
          break
        const currentText = parseBulletText(currentLine)
        if (currentText === null)
          break
        items.push(buildListItem(currentText))
        index += 1
      }

      content.push({
        type: 'bulletList',
        content: items,
      })
      continue
    }

    const orderedMatch = parseOrderedText(line)
    if (orderedMatch) {
      const start = orderedMatch.start
      const items: JiraAdfNode[] = []

      while (index < lines.length) {
        const currentLine = lines[index]
        if (currentLine === undefined)
          break
        const currentMatch = parseOrderedText(currentLine)
        if (!currentMatch)
          break
        items.push(buildListItem(currentMatch.text))
        index += 1
      }

      const orderedList: JiraAdfNode = {
        type: 'orderedList',
        content: items,
      }

      if (Number.isFinite(start) && start > 1) {
        orderedList.attrs = { order: start }
      }

      content.push(orderedList)
      continue
    }

    content.push(buildParagraph(line))
    index += 1
  }

  return {
    type: 'doc',
    version: 1,
    content,
  }
}

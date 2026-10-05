# Canary Interactive

## Overview

Appending to a dynamic array is <abbr>amortized</abbr> constant time[?unless this append triggers a resize, which copies every element]. A second claim carries its own caveat[?second caveat body].

## Callouts

> ⚠️ **Long Warning**
>
> Paragraph one explains why the warning matters before the reader commits to a design.
>
> Paragraph two names the failure mode that shows up only under production load.
>
> Paragraph three describes how the failure looks from the client side of the call.
>
> Paragraph four describes how the same failure looks from inside the server.
>
> Paragraph five lists the metrics that move first when the problem starts.
>
> Paragraph six gives the usual first fix and why it only helps for a while.
>
> Paragraph seven gives the durable fix and what it costs to run.
>
> Paragraph eight closes with the question an interviewer tends to ask next.

> ⚠️ + **Folded Note**
> A short note that starts folded because its author asked for it.

> 🧠 **Short Thought** One line that fits without folding.

> 🎯 **Interview tip**\
> Second line of the callout.\
> Third line of the callout.

## Formulas

A formula whose symbols have readable names:

$$
T = 1/\lambda
$$

A formula with no named symbols:

$$
e = mc^2
$$

## Tabs

<!-- tabs id="canary-sort" title="Quicksort" -->
```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot, rest = arr[0], arr[1:]
    return quicksort([x for x in rest if x <= pivot]) + [pivot] + quicksort([x for x in rest if x > pivot])
```
```java
static List<Integer> quicksort(List<Integer> arr) {
    return arr;
}
```
<!-- /tabs id="canary-sort" -->

## Practice problems

### 1. First Problem

**Problem.** Return the largest value in a non-empty list.

**Approach.** Keep a running maximum while scanning once.

```python
def largest(nums):
    best = nums[0]
    for n in nums:
        best = max(best, n)
    return best
```

**Complexity.** O(n) time, O(1) space.

### 2. Second Problem

**Problem.** Return whether a list contains a duplicate.

**Approach.** Insert each value into a set and stop at the first repeat.

**Complexity.** O(n) time, O(n) space.

## Long Form

The sections below exist so the page is large enough to count as a real article rather than a stub.

### First Reading Block

A glossary term is a word the wiki defines once and reuses everywhere. Hovering it shows the definition in a small card next to the word, and clicking or tapping it opens the same definition inline, inside the sentence, so it stays readable on a phone where there is no hover. Clicking anywhere else closes the inline definition again.

### Second Reading Block

A caveat marks a claim that is true in general but has an exception worth knowing. The marker sits at the end of the claim, and opening it reveals the exception in place, so a reader who only wants the headline is not slowed down by it, and a reader preparing for a follow-up question can see the fine print without leaving the paragraph.

### Third Reading Block

Practice problems hide their answers so a reader can attempt each one first. The eye button beside a problem reveals that problem's approach, code and complexity, and leaves every other problem alone. A preference sets whether answers start hidden or shown, and changing it while an article is open applies at once.

### Fourth Reading Block

A callout pulls one idea out of the flow of the text and gives it an icon that says what kind of idea it is: an interview angle, a warning, a line of reasoning, or a trade-off to weigh. Long callouts fold to a few lines with a button to show the rest, so a single long aside cannot push the main explanation off the screen. An author can also ask for a short callout to start folded when it holds detail most readers can skip.

### Fifth Reading Block

A formula can be read two ways. The symbols are compact and match what a textbook or a paper would print, while the names spell out what each symbol stands for. A toggle beside the formula swaps between the two, and a copy button copies the original LaTeX source so it can be pasted into notes or another document without retyping it.

### Sixth Reading Block

Code that exists in more than one language is grouped into tabs, one per language. Choosing a language on one tab group remembers the choice for the rest of the browsing session, so every later group opens on the same language without the reader having to pick it again, and a new session starts again from the first tab of each group.

### Seventh Reading Block

Every one of these controls works from the keyboard as well as the mouse. Glossary terms, caveat markers, tabs and the practice eye buttons all take focus in reading order, and Enter or Space activates the focused control the same way a click would. Folding a whole section with its heading chevron leaves each control inside it as it was, so reopening the section shows exactly what the reader last chose. None of these controls changes the text of the article itself; each one only changes how much of the text is on screen at a given moment.

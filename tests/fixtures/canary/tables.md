# Canary Tables

## Overview

This canary carries one plain table and two comparison tables. Plain tables render as fixed-layout tables that wrap their text inside the column. Tables under a Comparison heading get a scroll wrapper, sortable headers and column toggles.

## Plain Table

The table below has no complexity header, no Big-O cell and no Comparison heading above it, so it stays a plain table.

| Region | Primary Store | Replica Store | Failover Mode | Notes |
| ------ | ------------- | ------------- | ------------- | ----- |
| North | Leader database in the main data centre | Two followers in neighbouring zones | Manual promotion after an operator check | Writes pause while the new leader is chosen |
| South | Leader database in a rented colocation rack | One follower in a public cloud region | Automatic promotion through a consensus vote | Reads continue from the follower during the vote |

## Comparison

| Structure | Score | Notes |
| --------- | ----- | ----- |
| Stack | 30 | last in, first out |
| Queue | 10 | first in, first out |
| Deque | 20 | open at both ends |

### Wide Comparison

| Structure | Lookup Cost | Insert Cost | Memory Overhead | Ordering Guarantee | Typical Use Case |
| --------- | ----------- | ----------- | --------------- | ------------------ | ---------------- |
| Hash table | constant on average | constant on average | one bucket array plus chained entries | no ordering between keys | caching computed results by key |
| Balanced search tree | logarithmic in the key count | logarithmic in the key count | two child pointers and a balance field per node | keys stay sorted for range scans | ordered maps and interval queries |
| Skip list | logarithmic in expectation | logarithmic in expectation | a tower of forward pointers per node | keys stay sorted for range scans | concurrent ordered sets without locks |

## Long Form

The sections below exist so the page is large enough to count as a real article rather than a stub.

### First Reading Block

A comparison table earns its place when a reader needs to choose between options that differ on several axes at once. Each row is one option and each column is one axis, so the reader can scan down a column to compare every option on that axis, or across a row to see the full profile of one option. Sorting a column puts the strongest option on that axis at the top, and hiding a column removes an axis the reader has already decided does not matter.

### Second Reading Block

Wide tables are a problem on narrow screens. Squeezing every column into the viewport makes each cell a tall, thin strip of text that is hard to read, so a comparison table keeps its cells on one line and scrolls sideways inside its own wrapper instead. A fade on the right edge tells the reader there is more to see, and the fade disappears once they reach the last column.

### Third Reading Block

Sorting by a column of numbers only works when every cell is a number. A cell that reads not applicable, or a value with a unit or a thousands separator, is not a whole number, so it sorts after every numeric cell rather than being half-parsed into a misleading value. Complexity columns get their own order, from constant through logarithmic, linear, linearithmic and quadratic, up to exponential and factorial, so a column of Big-O cells sorts by growth rate rather than alphabetically.

### Fourth Reading Block

Hiding a column is remembered per table, per article, on this device. The choice is keyed by the table's header names, so two tables in the same article keep separate choices, and editing a header resets the choice for that table only. The first column is never offered as a toggle, because it names the row and the table would be meaningless without it. Printing an article shows every column regardless of what is hidden on screen.

### Fifth Reading Block

A reader who uses the keyboard can sort too: every sortable header takes focus in reading order, and pressing Enter or Space on it sorts by that column, the same as a click. Pressing it again reverses the order. The arrow beside the header shows which column is active and in which direction, while the other headers show a faint double arrow to say they can be sorted as well. On touch screens the headers grow to a comfortable tap height.

### Sixth Reading Block

Rows keep their original order until a reader sorts, so the author's ordering is what everyone sees first. That ordering often carries meaning of its own, such as the order in which a lesson introduces each structure, or a rough ranking from the most common choice to the most specialised. Sorting is a lens the reader applies for the moment, and reloading the article brings back the author's order, while hidden columns stay hidden until the reader shows them again.

### Closing Notes

Plain tables take the other approach: they keep to the width of the text column and let long cells wrap onto several lines, because they are usually short reference lists rather than side-by-side comparisons.

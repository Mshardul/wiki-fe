---
> 14th July 2026
---

## misc

- this error logged on console, when i opened the page - "Cannot load stylesheet https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css. Failed integrity metadata check. Content length: 856, Expected content length: 309, Expected metadata: sha384-oaMLBGEzBOJx3UHwac0cVndtX5fxGQIfnAeFZ35RTgqPcYlbprH9o9PUV/F8Le07"

- also, this error logged on console as soon as i opened the page - "[Error] Fetch API cannot load https://wiki-be.onrender.com/api/v1/auth/me due to access control checks." i think its trying to call BE directly. why are we doing this exactly? seems like an unnecessary calls, also we should not log errors like this.

- as soon as i logged in, i got a toast saying "You have unsaved items on this device from browsing signed out. Keep them in your account?", but the text was all cut-off, also no action button. all hidden behind the toast boundary, i guess.

- clicking on "logout" button, just logs the user out. there's no toast success or nothing. it just logs you out. and same for login as well.

- the toasts can be of different colors based on the type (success, warning, info, etc) and also filled/outline with different text colors based on light/dark theme. what do you think?

- some of the changelog entries are really too too big, some with no description. typically it should be a single sentence description (upto 10-12 words) for each file in each date.

## page 1 - homepage

- as we have only 2 verticals as of now. here's what i am thinking. we should have a row of 2 for mobile, 4 for laptop, 6 for monitors. in any of the devices, we need equal spacing around and between the cards, so that they look properly evened out.

- the "login/logout" button is so off to the right, as compared to the same button in the other 2 pages. why?? those seem to have some margin/padding for the header. but it shouldn't be like that. the header should be common in all the pages (except for some special icons/buttons in some special pages)

## page 2 - particular vertical (eg. DSA) page

- when i clicked on "DSA", it called all the md pages in DSA. then when i opened "array.md", it called BE 4 calls - twice for "array.md", once for "recent", once for "backlinks", why so many calls?

- if there are no "recent" or "bookmark", we should not show those dummy sentences. they look really weird. let's remove the entire section altogether.

- the "filter articles" search box looks really weird. here's what i am thinking, we should have a drop down (similar to the one in the modal). this dropdown will have 3 options - "all", "read only", "unread only". and then search icon instead of "Unread only" in the button. what do you think?

- the "expand/collapse all" icons in the title section look really bad. let's go with our standard icons - tabler, i think.

- the article cards show explanation cards on hover - why? these cards already have explanations, we don't want anything on hover.

- why do i see "circular progress" button on this page? what purpose does it satisfy?

## page 3 - article page - header

- on the articles page, there are too many icons on the top - hide everything, they should go in the "preference" modal. only couple of icons should be on the top, i think it was mentioned in one of the tickets. check in previously done tickets.

- in the headers on the article page, i see single-select chips group - | skim | study | reference | the thing is that i don't see any changes, even when i try changing these. are they wired? if not fix them. either way, we won't need these here after change #5, but we will anyway have it in "preference" modal.

- the icons and texts seem totally mis-aligned, vertically.

## page 3 - article page - main article

- in the article page, should we remove the TOC from the main article section, as we already have TOC section present (almost) always (unless explicitly hidden)? what do you think?

- "prerequisites" should not be these big statements. they should be simple chips. maybe coloured. when hovered, it should show the initial definition (similar feature is already implemented on links). when clicked, it should redirect to the actual page of that article.

- section expand/collapse icons are really weird. let's replace with our standard icons - tabler, i think.

- code block copy icon is really weird. let's replace with our standard icons - tabler, i think.

- on expanding code block by clicking "show more", the updated "show less" button hides the last line of the code block. should we make it a bit transparent? and opaque on hover? how would that look on mobile? let's discuss.

- the progress ring is overlapping with the back-to-top button. ideally, they should be a single button. the progress ring should be the boundary of the back-to-top button.

- in the quiz mode - a click should show/hide the answer, not just show the answer; also, when `?` in a table, it should be centered. otherwise some `?` are left-floating, some centered, some right-floating.

- adding emoticon to the article texts goes really bad. eg. for the start of the paragraph, it applies on the top of the statement, instead of in front of it. or sometimes even to the end of the previous paragraph.

## page 3 - article page - TOC section

- in the TOC section on the right, all the elements have expand/collapse chevron, even when it doesn't have subsections to be expanded/collapsed. also, no matter which chevron is clicked, it's expanding/collapsing the last one only (not the one clicked). i tested this on "array.md" specifically.

- the coloring is really off. the eg. if i am between 2 sections, the entire toc is greyed out, even if there are some sections that are definitely below the current view of the page. the blink also seems off sometimes, even when i am not scrolling too fast. also, it's going from greyed to coloured. i want it to go from empty with boundary color (like an empty one) and transitioning to filled circle. that would be a better blink.

## page 3 - article page - notes section

- on the article page, the "notes" has really bad placing. the {toc + notes} now have combined scroll, which looks really really bad. and the notes. we have option to resize the notes, but we can't make it long enough, coz (a) the toc will hide, and (b) it is already at the end of the page, i can't drag the pointer out of the screen.

## page 3 - article page - modal

- in the "search all wiki", when i select "DSA", the dropdown goes beyond the boundary of the modal from the right side bcoz of the big name. this crops the dropdown from right. `ESC` button is not even visible.

- are all the keyboard shortcuts updated in the list? let's also add a section for mobile gestures.

- "switch wiki" modal - text is cutting off. it is going outside the boundary of the modal from right.

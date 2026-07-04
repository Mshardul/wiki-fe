function printArticle() {
  document.getElementById("markdown-body")?.setAttribute("data-print-url", location.href);
  window.print();
}

export { printArticle };

export function belongsToSection(item, section) {
  const adult = item?.provider === "hentaiocean" || item?.streamProvider === "hentaiocean";
  return section === "hentai" ? adult : !adult;
}

export function sectionItems(items, section, query = "") {
  const search = query.trim().toLocaleLowerCase();
  return items.filter((item) => belongsToSection(item, section) &&
    (!search || String(item.title || item.anime_title || "").toLocaleLowerCase().includes(search)));
}

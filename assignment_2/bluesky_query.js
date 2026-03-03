class BlueskyQuery {
  queryURL = "https://public.api.bsky.app/xrpc/app.bsky.feed.searchposts"; // no posts?

  async query(query) {
    let specificURL = `${this.queryURL}?q=${encodeURIComponent(query)}&limit=10`;
    try {
      let response = await fetch(specificURL);
      let data = await response.json();

      data.posts.forEach((post) => {
        console.log(post.record.text + " ---- " + post.record.createdAt);
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }
}

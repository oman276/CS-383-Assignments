class BlueskyQuery {
  queryURL = "https://public.api.bsky.app/xrpc/app.bsky.feed.searchposts";

  constructor(handle, appPassword) {
    this.handle = handle;
    this.appPassword = appPassword;
  }

  async authenticate() {
    let url = `https://bsky.social/xrpc/com.atproto.server.createSession`;
    try {
      let response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: this.handle,
          password: this.appPassword,
        }),
      });
      let data = await response.json();
      if (data.accessJwt) {
        this.accessToken = data.accessJwt;
        console.log("Authenticated successfully");
      } else {
        console.error("Authentication failed:", data);
      }
    } catch (error) {
      console.error("Error authenticating:", error);
    }
  }

  async query(query) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    let specificURL = `${this.queryURL}?q=${encodeURIComponent(query)}&limit=10`;
    try {
      let response = await fetch(specificURL, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      let data = await response.json();

      data.posts.forEach((post) => {
        console.log(post.record.text + " ---- " + post.record.createdAt);
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }
}

class BlueskyQuery {
  queryURL = "https://bsky.social/xrpc/app.bsky.feed.searchposts";

  constructor(handle, appPassword) {
    this.handle = handle;
    this.appPassword = appPassword;

    this.authenticate();
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

  async query(query, limit = 10) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    let specificURL = `${this.queryURL}?q=${encodeURIComponent(query)}&limit=${limit}`;
    try {
      let response = await fetch(specificURL, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      let data = await response.json();

      /*
      data.posts.forEach((post) => {
        console.log(post.record.text + " ---- " + post.record.createdAt);
      });
			*/
      // console.log(query, ": word query successful");

      return data.posts;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  // at some point we'll also want to be able to grab from the firehose
  // we'll also want a content filter for porn and trump
}

const {
  composeCreatePullRequest,
} = require("octokit-plugin-create-pull-request");

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = (app) => {
  // Your code here
  app.log("Yay, the app was loaded!");

  app.on("pull_request.closed", async (context) => {
    const {
      payload: { pull_request: pr, repository },
      log,
    } = context;

    if (!pr.merged) {
      log.debug(`pull request ignored, because not merged.`);
      return;
    }

    if (pr.user.type === "Bot") {
      log.debug(`pull request ignored, user is bot.`);
      return;
    }

    const username = pr.user.login;

    return composeCreatePullRequest(context.github, {
      owner: repository.owner.login,
      repo: repository.name,
      title: `Add @${username} to AUTHORS`,
      body: `Thank you @${username} for your contribution at #${pr.number}`,
      head: `update-authors-${Date.now()}`,
      createWhenEmpty: false,
      changes: {
        files: {
          AUTHORS: ({ exists, encoding, content }) => {
            if (!exists) return `We thank our contributors:\n\n@${username}`;

            const currentContent = Buffer.from(content, encoding).toString();

            if (new RegExp(`@${username}\n`).test(currentContent)) return null;

            return currentContent.trim() + "\n@" + username + "\n";
          },
        },
        emptyCommit: false,
        commit: `Add @${username} to AUTHORS`,
      },
    })
      .then((response) => {
        if (response === null) {
          log.debug(
            `@${username} already listed in AUTHORS, no pull request created.`
          );
          return;
        }

        log.debug(
          `Pull request adding @${username} created: ${response.data.html_url}`
        );
      })
      .catch(console.error);
  });
};

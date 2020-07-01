const { composeCreatePullRequest } = require("octokit-plugin-create-pull-request");

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = (app) => {
  app.on("pull_request.closed", async (context) => {
    const { payload: { pull_request: pr, repository }, log } = context;

    if (!pr.merged) return log.debug(`pull request ignored, because not merged.`);
    if (pr.user.type === "Bot") return log.debug(`pull request ignored, user is bot.`);

    const response = await composeCreatePullRequest(context.github, {
      owner: repository.owner.login,
      repo: repository.name,
      title: `Add @${pr.user.login} to AUTHORS`,
      body: `Thank you @${pr.user.login} for your contribution at #${pr.number}`,
      head: `update-authors-${Date.now()}`,
      createWhenEmpty: false,
      changes: {
        files: {
          "AUTHORS": ({ exists, encoding, content }) => {
            if (!exists) return `We thank our contributors:\n\n@${pr.user.login}`;
            const currentContent = Buffer.from(content, encoding).toString();
            if (new RegExp(`@${pr.user.login}\n`).test(currentContent)) return null;
            return currentContent.trim() + "\n@" + pr.user.login + "\n";
          },
        },
        emptyCommit: false,
        commit: `Add @${pr.user.login} to AUTHORS`,
      },
    })

    if (response === null) return log.debug( `@${pr.user.login} already listed in AUTHORS, no pull request created.`);
    log.debug(`Pull request adding @${pr.user.login} created: ${response.data.html_url}`);
  });
};

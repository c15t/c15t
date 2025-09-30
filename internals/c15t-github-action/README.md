# C15T Sticky Pull Request Comment

Create a comment on a pull request, if it exists update that comment. Forked from `marocchino/sticky-pull-request-comment`.

## Usage

```yaml
permissions:
  pull-requests: write

steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/c15t-github-action
    with:
      message: |
        Release ${{ github.sha }} to https://pr-${{ github.event.number }}.example.com
```

All inputs/outputs are the same as the original action. See `action.yml` for details.

# Upload to Nexus

This GitHub Action upload given file(s) to pointed Nexus instance.

## Usage

```yaml
- uses: cdqag/upload-to-nexus@v1
  with:
    instance-url: ${{ vars.NEXUS_URL }}
    username: ${{ vars.NEXUS_USER }}
    password: ${{ secrets.NEXUS_PASS }}
    repository: my-repository
    default-destination: some/path/or/empty/string
    files: |
      file1.txt
      file2.txt => some/other/path/with-other-name.txt
      sub/* => oh/look/it/works/*
```

## Inputs

* `instance-url` **Required**

    Nexus instance URL.

* `username` _Default: ''_

    Username to authenticate. Set empty string to skip authentication.

* `password` _Default: ''_

    Password to authenticate. This may be an empty string.

* `repository` **Required**

    Repository name.

* `default-destination` _Default: ''_

    Default destination path for uploaded files. If not set, files will be uploaded to the root of the repository.

* `files` **Required**

    List of files to upload. Each file should be on a separate line. If you want to upload a file to a different path or with a different name, use `=>` to separate the source and destination paths. If you want to upload all files from a directory, use `*` at the end of the path. For more information show examples below.

* `if-local-file-does-not-exist` _Default: 'fail'_

    What to do if a local file does not exist. Possible values: `fail`, `warn-and-ignore` or `silent-ignore`.

## Examples

### Upload single file

This example will:

* upload `./file1.txt` to `/my-repository/some/path/file1.txt`
* if `./file1.txt` does not exist, it will print a warning and continue

```yaml
- uses: cdqag/upload-to-nexus@v1
  with:
    instance-url: ${{ vars.NEXUS_URL }}
    username: ${{ vars.NEXUS_USER }}
    password: ${{ secrets.NEXUS_PASS }}
    repository: my-repository
    default-destination: some/path
    files: |
      file1.txt
    if-local-file-does-not-exist: warn-and-ignore
```

### Upload multiple files

This example will:

* `./file1.txt` to `/my-repository/other/name.txt`
* `./file2.txt` to `/my-repository/some/path/file2.txt`
* find all files in `./sub/` and upload them to `/my-repository/oh/look/`, keeping original file names
* if any file does not exist, it will fail

```yaml
- uses: cdqag/upload-to-nexus@v1
  with:
    instance-url: ${{ vars.NEXUS_URL }}
    username: ${{ vars.NEXUS_USER }}
    password: ${{ secrets.NEXUS_PASS }}
    repository: my-repository
    files: |
      file1.txt => other/name.txt
      file2.txt => some/path/*
      sub/* => oh/look/*
```

## Resources

* This action uses [@action/http-client](https://github.com/actions/toolkit/tree/main/packages/http-client) to send requests to Nexus.
* Supports glob batters thanks to [mrmlnc/fast-glob](https://github.com/mrmlnc/fast-glob).
* Nexus documentation [Direct Upload using HTTP PUT to the Repository Path](https://support.sonatype.com/hc/en-us/articles/115006744008-Repository-How-can-I-programmatically-upload-files-into-Nexus-3#DirectUploadusingHTTPPUTtotheRepositoryPath)

## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file for details.

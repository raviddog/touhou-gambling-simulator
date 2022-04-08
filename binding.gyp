{
  "targets": [
    {
      "target_name": "read",
      "sources": [ "read.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      'defines': ['NAPI_DISABLE_CPP_EXCEPTIONS']
    }
  ]
}
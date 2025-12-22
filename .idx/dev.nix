{ pkgs, ... }: {
  # Инструменты, которые будут установлены в Студии
  packages = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.openssh
  ];

  idx = {
    # Расширения для удобства кода
    extensions = [
      "ms-python.python"
    ];

    previews = {
      enable = true;
      previews = {
        web = {
          # Теперь запускаем реальный локальный сервер для отладки кода
          command = ["bash" "devserver.sh" "--port" "$PORT" "--host" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}
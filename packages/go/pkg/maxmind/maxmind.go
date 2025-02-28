package maxmind

import (
	"log/slog"

	"github.com/charmbracelet/ssh"
	"github.com/charmbracelet/wish"
	"github.com/oschwald/geoip2-golang"
)

func Middleware() wish.Middleware {
	db, err := geoip2.Open("GeoLite2-Country.mmdb")
	if err != nil {
		slog.Warn("Could not open GeoIP2 database")
		slog.Error(err.Error())
	}
	// defer db.Close()

	return func(sh ssh.Handler) ssh.Handler {
		return func(s ssh.Session) {
			s.Context().SetValue("maxmind", db)
			sh(s)
		}
	}
}

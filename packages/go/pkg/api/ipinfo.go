package api

import (
	"context"
	"log/slog"
	"net"

	"github.com/ipinfo/go/v2/ipinfo"
	"github.com/terminaldotshop/terminal/go/pkg/resource"
)

// GetCountryFromIP gets country code from IP address using ipinfo.io
func GetCountryFromIP(ctx context.Context, ipAddress string) string {
	// Use a hardcoded token for now
	token := resource.Resource.IpinfoToken.Value
	client := ipinfo.NewClient(nil, nil, token)

	// Convert string to net.IP
	ip := net.ParseIP(ipAddress)
	if ip == nil {
		slog.Error("failed to parse IP address", "ip", ipAddress)
		return ""
	}

	// Get IP information
	info, err := client.GetIPInfo(ip)
	if err != nil {
		slog.Error("failed to get country from IP", "error", err, "ip", ipAddress)
		return ""
	}

	slog.Info("got country from IP", "country", info.Country, "ip", ipAddress)
	return info.Country
}

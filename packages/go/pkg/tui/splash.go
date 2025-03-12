package tui

import (
	"log/slog"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/terminaldotshop/terminal-sdk-go"
	"github.com/terminaldotshop/terminal-sdk-go/option"
	"github.com/terminaldotshop/terminal/go/pkg/api"
	"github.com/terminaldotshop/terminal/go/pkg/resource"
)

type SplashState struct {
	data  bool
	delay bool
}

type UserSignedInMsg struct {
	accessToken string
	client      *terminal.Client
}

type DelayCompleteMsg struct{}

func (m model) LoadCmds() []tea.Cmd {
	cmds := []tea.Cmd{}

	// Make sure the loading state shows for at least a couple seconds
	cmds = append(cmds, tea.Tick(time.Second*2, func(t time.Time) tea.Msg {
		return DelayCompleteMsg{}
	}))

	cmds = append(cmds, func() tea.Msg {
		response, err := m.client.View.Init(m.context)
		if err != nil {
			slog.Error(err.Error())
		}
		return response.Data
	})

	return cmds
}

func (m model) IsLoadingComplete() bool {
	return m.state.splash.data &&
		m.state.splash.delay
}

func (m model) SplashInit() tea.Cmd {
	cmd := func() tea.Msg {
		// TODO: error handling
		token, err := api.FetchUserToken(m.fingerprint)
		if err != nil {
			return tea.Quit
		}

		// Setup options for the Terminal SDK client
		options := []option.RequestOption{
			option.WithBaseURL(resource.Resource.Api.Url),
			option.WithBearerToken(token.AccessToken),
			option.WithAppID("ssh"),
		}

		// Get client IP from context
		clientIP, _ := m.context.Value("client_ip").(*string)

		if clientIP != nil {
			// Get country code from IP address using ipinfo.io
			countryCode := api.GetCountryFromIP(m.context, *clientIP)

			// Convert country code to region (na, eu, or empty string)
			region := countryToRegion(countryCode)

			// Add the region header if we determined a region
			if region != "" {
				options = append(options, option.WithHeader("x-terminal-region", region))
			}

			// Add the client IP header if we got a client IP
			options = append(options, option.WithHeader("x-terminal-ip", *clientIP))
		}

		client := terminal.NewClient(options...)

		return UserSignedInMsg{
			accessToken: token.AccessToken,
			client:      client,
		}
	}

	return tea.Batch(m.CursorInit(), cmd)
}

func (m model) SplashUpdate(msg tea.Msg) (model, tea.Cmd) {
	switch msg := msg.(type) {
	case UserSignedInMsg:
		m.client = msg.client
		m.accessToken = msg.accessToken
		return m, tea.Batch(m.LoadCmds()...)
	case DelayCompleteMsg:
		m.state.splash.delay = true
	case terminal.ViewInitResponseData:
		m.state.splash.data = true
	}

	if m.IsLoadingComplete() {
		return m.ShopSwitch()
	}
	return m, nil
}

func (m model) SplashView() string {
	return lipgloss.Place(
		m.viewportWidth,
		m.viewportHeight,
		lipgloss.Center,
		lipgloss.Center,
		m.LogoView(),
	)
}

// countryToRegion converts a country code to a region ("na", "eu", or empty string if no match)
func countryToRegion(country string) string {
	if country == "" {
		return ""
	}

	countryCode := strings.ToLower(country)

	// North America
	if countryCode == "us" || countryCode == "ca" || countryCode == "mx" {
		return "na"
	}

	// European Union countries and related
	euCountries := []string{
		"at", // Austria
		"be", // Belgium
		"bg", // Bulgaria
		"hr", // Croatia
		"cy", // Cyprus
		"cz", // Czechia
		"dk", // Denmark
		"ee", // Estonia
		"fi", // Finland
		"fr", // France
		"de", // Germany
		"gr", // Greece
		"hu", // Hungary
		"ie", // Ireland
		"it", // Italy
		"lv", // Latvia
		"lt", // Lithuania
		"lu", // Luxembourg
		"mt", // Malta
		"nl", // Netherlands
		"pl", // Poland
		"pt", // Portugal
		"ro", // Romania
		"sk", // Slovakia
		"si", // Slovenia
		"es", // Spain
		"se", // Sweden
		"eu", // European Union
		"is", // Iceland
		"li", // Liechtenstein
		"no", // Norway
		"ch", // Switzerland
		"uk", // United Kingdom
	}

	for _, eu := range euCountries {
		if countryCode == eu {
			return "eu"
		}
	}

	return ""
}

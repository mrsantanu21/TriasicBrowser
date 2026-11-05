package com.triasicbrowser.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://www.google.com";
    private static final int INK = Color.rgb(20, 22, 30);
    private static final int ACCENT = Color.rgb(124, 92, 252);

    private WebView browser;
    private EditText address;
    private ProgressBar progress;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(INK);
        getWindow().setNavigationBarColor(INK);
        buildBrowserUi();
        configureBrowser();
        if (savedInstanceState == null) {
            browser.loadUrl(HOME_URL);
        } else {
            browser.restoreState(savedInstanceState);
        }
    }

    private void buildBrowserUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(8), dp(4), dp(8), dp(4));
        toolbar.setBackgroundColor(INK);

        TextView brand = new TextView(this);
        brand.setText("Triasic");
        brand.setTextColor(Color.WHITE);
        brand.setTextSize(18);
        brand.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        brand.setPadding(dp(4), 0, dp(6), 0);
        toolbar.addView(brand, new LinearLayout.LayoutParams(0, dp(48), 1));

        Button back = toolbarButton("‹");
        back.setContentDescription("Go back");
        back.setOnClickListener(v -> { if (browser.canGoBack()) browser.goBack(); });
        toolbar.addView(back, buttonParams());

        Button forward = toolbarButton("›");
        forward.setContentDescription("Go forward");
        forward.setOnClickListener(v -> { if (browser.canGoForward()) browser.goForward(); });
        toolbar.addView(forward, buttonParams());

        Button reload = toolbarButton("↻");
        reload.setContentDescription("Reload page");
        reload.setOnClickListener(v -> browser.reload());
        toolbar.addView(reload, buttonParams());
        root.addView(toolbar);

        LinearLayout addressRow = new LinearLayout(this);
        addressRow.setOrientation(LinearLayout.HORIZONTAL);
        addressRow.setGravity(Gravity.CENTER_VERTICAL);
        addressRow.setPadding(dp(10), dp(6), dp(10), dp(6));
        addressRow.setBackgroundColor(INK);

        address = new EditText(this);
        address.setSingleLine(true);
        address.setTextSize(15);
        address.setHint("Search or enter a website");
        address.setHintTextColor(Color.rgb(120, 123, 136));
        address.setTextColor(INK);
        address.setSelectAllOnFocus(true);
        address.setImeOptions(EditorInfo.IME_ACTION_GO);
        address.setInputType(android.text.InputType.TYPE_CLASS_TEXT);
        address.setPadding(dp(14), 0, dp(10), 0);
        address.setBackground(roundRect(Color.WHITE, dp(12)));
        address.setOnEditorActionListener((view, actionId, event) -> {
            boolean enter = event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER
                    && event.getAction() == KeyEvent.ACTION_DOWN;
            if (actionId == EditorInfo.IME_ACTION_GO || enter) {
                navigateFromAddress();
                return true;
            }
            return false;
        });
        addressRow.addView(address, new LinearLayout.LayoutParams(0, dp(46), 1));

        Button go = toolbarButton("Go");
        go.setTextSize(14);
        go.setTextColor(Color.WHITE);
        go.setOnClickListener(v -> navigateFromAddress());
        addressRow.addView(go, new LinearLayout.LayoutParams(dp(54), dp(46)));
        root.addView(addressRow);

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(ACCENT));
        progress.setProgressBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.LTGRAY));
        root.addView(progress, new LinearLayout.LayoutParams(-1, dp(2)));

        browser = new WebView(this);
        root.addView(browser, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.HORIZONTAL);
        bottom.setGravity(Gravity.CENTER);
        bottom.setPadding(dp(8), dp(4), dp(8), dp(4));
        bottom.setBackgroundColor(Color.rgb(248, 248, 251));

        Button home = bottomButton("Home");
        home.setOnClickListener(v -> browser.loadUrl(HOME_URL));
        bottom.addView(home, new LinearLayout.LayoutParams(0, dp(48), 1));

        Button share = bottomButton("Share");
        share.setOnClickListener(v -> shareCurrentPage());
        bottom.addView(share, new LinearLayout.LayoutParams(0, dp(48), 1));
        root.addView(bottom);

        setContentView(root);
    }

    private void configureBrowser() {
        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        browser.setOverScrollMode(View.OVER_SCROLL_NEVER);
        browser.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    return false;
                }
                openExternalLink(uri);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                address.setText(url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                address.setText(url);
            }
        });
        browser.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                progress.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
            }
        });
    }

    private void navigateFromAddress() {
        String input = address.getText().toString().trim();
        if (input.isEmpty()) return;
        String target;
        if (input.matches("(?i)^[a-z][a-z0-9+.-]*:.*")) {
            target = input;
        } else if (input.contains(".") && !input.contains(" ")) {
            target = "https://" + input;
        } else {
            target = "https://www.google.com/search?q=" + Uri.encode(input);
        }
        ((InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE))
                .hideSoftInputFromWindow(address.getWindowToken(), 0);
        address.clearFocus();
        browser.loadUrl(target);
    }

    private void openExternalLink(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            Toast.makeText(this, "No app can open this link", Toast.LENGTH_SHORT).show();
        }
    }

    private void shareCurrentPage() {
        String url = browser.getUrl();
        if (url == null) return;
        Intent share = new Intent(Intent.ACTION_SEND);
        share.setType("text/plain");
        share.putExtra(Intent.EXTRA_TEXT, url);
        startActivity(Intent.createChooser(share, "Share page"));
    }

    @Override
    public void onBackPressed() {
        if (browser != null && browser.canGoBack()) browser.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (browser != null) browser.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (browser != null) {
            browser.stopLoading();
            browser.destroy();
        }
        super.onDestroy();
    }

    private Button toolbarButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextColor(Color.WHITE);
        button.setTextSize(20);
        button.setAllCaps(false);
        button.setMinWidth(0);
        button.setMinimumWidth(0);
        button.setPadding(dp(6), 0, dp(6), 0);
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(INK));
        return button;
    }

    private Button bottomButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextSize(14);
        button.setTextColor(INK);
        button.setAllCaps(false);
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(248, 248, 251)));
        return button;
    }

    private LinearLayout.LayoutParams buttonParams() {
        return new LinearLayout.LayoutParams(dp(42), dp(48));
    }

    private android.graphics.drawable.GradientDrawable roundRect(int color, int radius) {
        android.graphics.drawable.GradientDrawable drawable = new android.graphics.drawable.GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}

"""Hello world views: an HTML page and a JSON endpoint."""

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_safe


@require_safe
def index(request: HttpRequest) -> HttpResponse:
    return render(request, "hello/index.html")


@require_safe
def hello(request: HttpRequest) -> JsonResponse:
    name = request.GET.get("name") or "world"
    response = JsonResponse({"message": f"hello, {name}"})
    # Frontends on other origins (e.g. a Vite blueprint) call this directly.
    response["Access-Control-Allow-Origin"] = "*"
    return response


@require_safe
def healthz(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})

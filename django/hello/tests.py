from django.test import SimpleTestCase


class IndexTests(SimpleTestCase):
    def test_renders_hello_world_page(self) -> None:
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<h1>Hello World</h1>", html=True)
        self.assertContains(response, 'href="/api/hello?name=Shoal"')


class HelloApiTests(SimpleTestCase):
    def test_defaults_to_world(self) -> None:
        response = self.client.get("/api/hello")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"message": "hello, world"})

    def test_empty_name_defaults_to_world(self) -> None:
        response = self.client.get("/api/hello", {"name": ""})

        self.assertEqual(response.json(), {"message": "hello, world"})

    def test_greets_name(self) -> None:
        response = self.client.get("/api/hello", {"name": "Louis"})

        self.assertEqual(response.json(), {"message": "hello, Louis"})

    def test_allows_cross_origin_reads(self) -> None:
        response = self.client.get("/api/hello")

        self.assertEqual(response["Access-Control-Allow-Origin"], "*")

    def test_rejects_post(self) -> None:
        response = self.client.post("/api/hello")

        self.assertEqual(response.status_code, 405)


class HealthzTests(SimpleTestCase):
    def test_reports_ok(self) -> None:
        response = self.client.get("/healthz")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_answers_head(self) -> None:
        response = self.client.head("/healthz")

        self.assertEqual(response.status_code, 200)

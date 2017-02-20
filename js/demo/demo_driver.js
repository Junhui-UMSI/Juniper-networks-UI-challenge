(function () {
    function DataFetcher(urlFactory, delay) {
        var self = this;

        self.repeat = false;
        self.delay = delay;
        self.timer = null;
        self.requestObj = null;

        function getNext() {
            self.requestObj = $.ajax({
                    url: urlFactory()
                }).done(function(response) {
                    $(self).trigger("stateFetchingSuccess", {
                        result: response
                    });
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    $(self).trigger("stateFetchingFailure", {
                        error: textStatus
                    });
                }).always(function() {
                    if (self.repeat && _.isNumber(self.delay)) {
                        self.timer = setTimeout(getNext, self.delay);
                    }
                });
        }

        self.start = function(shouldRepeat) {
            self.repeat = shouldRepeat;
            getNext();
        };

        self.stop = function() {
            self.repeat = false;
            clearTimeout(self.timer);
        };

        self.repeatOnce = function() {
            getNext();
        };

        self.setDelay = function(newDelay) {
            this.delay = newDelay;
        };
    }

    function addNewEntry($container, contentHTML) {
        var $innerSpan = $("<p/>").text(contentHTML),
            $newEntry = $("<li/>").append($innerSpan);

        $container.append($newEntry);
    }

    var $trafficStatusList = $("#mockTrafficStat"),
        df2 = new DataFetcher(function() {
            return "/traffic_status";
        });

    $(df2).on({
        "stateFetchingSuccess": function(event, data) {
            data.result.data.forEach(function(dataEntry) {
                addNewEntry($trafficStatusList, JSON.stringify(dataEntry));
            });
        },
        "stateFetchingFailure": function(event, data) {
            addNewEntry($trafficStatusList, JSON.stringify(data.error));
            addNewEntry($trafficStatusList, "Hit a snag. Retry after 1 sec...");
            setTimeout(function() {
                $trafficStatusList.html("");
                df2.repeatOnce();
            }, 1000);
        }
    });

    df2.start();
})();
(function ($) {

    //Defaults - Local Settings
    var ls = {
        azureSearch: {
            url: "",
            key: "",
            isFuzzy: false,
            fuzzyProximity: 0,
            isWildcard: false,
            useTermProximity: false,
            termProximityDistance: 0,
        },
        googleGeocodeApi: {
            key: null,
            url: "https://maps.googleapis.com/maps/api/geocode/json",
            language: 'en'
        },
        geoSearch: {
            lat: null,
            lng: null,
            fieldName: '_distance',
            azureFieldName: null,
            unit: 'K',
            maxDistance: null
        },
        searchParams: {
            search: "*",
            facets: [],
            count: true,
            top: null,
            skip: 0,
            filter: null,
            orderby: null,
            queryType: 'full'
        },
        dates: {
            hasDates: false,
            fields: {
                zone: 'EST',
                from: {
                    indexField: null,
                    fieldId: null
                },
                to: {
                    indexField: null,
                    fieldId: null
                }
            }
        },
        facets: {
            facet: '<a href=\"#\"/>',
            facetAltText: 'Filter results by ',
            facetClass: 'facet',
            titleWrapper: "<h2/>",
            title: "<a href=\"#\"/>",
            titleClass: "",
            titleOnClick: function () { },
            titleWrapperClass: "facet-title",
            container: "#facets",
            wrapperContainer: "<ul/>",
            wrapperContainerClass: "facet-list",
            wrapper: "<li/>",
            wrapperClass: "facet-item",
            showCount: true,
            countWrapper: null,
            countWrapperClass: null,
            facetOnClick: defaultFacetChange,
            searchMode: 'and',
            onFacetSelect: defaultFacetSelect,
            groupWrapper: '<div/>',
            groupWrapperClass: 'group',
            emptyFacetText: '(none)',
            // optional functions to sort & translate
            sortFacets: null,
            translateFacets: null
        },
        facetsApplied: {
            container: null,
            class: 'selected-facet',
            extraAttributes: {},
            ignoreFacets: [],
            groupFacetsByType: false,
            updateHistory: false,
            clearAll: {
                enabled: true,
                label: 'Clear all',
                className: ''             
            },  
            onChange: function () { }
        },
        facetsDictionary: [],
        // Array containing facetname|facetvalue|translation_key
        facetsSelected: [],
        results: {
            container: '#results',
            template: null,
            noResultsClasses: '',
            onCreate: function () { },
            loaderContainer: null,
            resultsMsgContainer: null,
            pager: {
                container: null,
                loadMore: true,
                infinite: false,
                infiniteClick: false,
                appendPager: false,
                pageSize: 50,
                pagerRangeIncrement: 5,
                pagerItems: true,
                pagerEnders: false,
                updateHistory: false,
                labels: {
                    prev: 'Previous',
                    next: 'Next',
                    first: 'First',
                    last: 'Last',
                    load: 'load more',
                    ada: {
                        current: 'You are on page',
                        item: 'Go to page',
                        prev: 'Go to the previous page of results',
                        next: 'Go to the next page of results',
                        first: 'Go to the first page of results',
                        last: 'Go to the last page of results',
                        load: 'Load more results'
                    }
                },
                classes: {
                    prev: '',
                    next: '',
                    last: '',
                    results: '',
                    load: ''
                },
                onRender: function () { },
                onPageChange: function () { }
            },
            labels: {
                activeFacets: "Filters",
                noResults: 'Sorry there are no results for your query',
                haveResults: 'Results Found {count}',
                haveQuery: 'Your search for {query} returned {count}',
            }
        },
        urlParameters: {
            address: 'a',
            latitude: 'l',
            longitude: 'ln',
            latlong: null,
            search: 'q',
            facets: 'fc',
            page: 'p'
        },
        orderbyOptions: {
            orderbySelector: null,
            orderbyEvent: 'click',
            onOrderbyChange: defaultOrderbyChange
        },
        onResults: processResults,
        onLoad: function () { },
        debug: false
    };

    //Internal Parameters
    var local = {
        container: null,
        totalPages: 0,
        currentPage: 1,
        pagerRange: [],
        pagerRendered: false,
        pagerListenersAdded: false,
        pagerInifiniteClicked: false,
        waitingLatLong: false,
        isGeoSearch: false,
        totalResults: 0,
        initialized: false,
        rendered: false,
        dateSearch: false,
        fromDate: null,
        toDate: null,
        clearAllAdded: false,
        queryText: null,
        hasActiveFacets: false,
        returnedParams: null,
        additionalFacetsDictionary: []
    };

    /**
     * jQuuery Plugin Definition
     */

    $.fn.azuresearch = function (options, action) {

        local.container = this;
        if (!action)
            action = 'search';

        if (options) {
            //Default options.
            if (options.azureSearch)
                options.azureSearch = $.extend(ls.azureSearch, options.azureSearch);
            if (options.googleGeocodeApi) 
                options.googleGeocodeApi = $.extend(ls.googleGeocodeApi, options.googleGeocodeApi);
            if (options.geoSearch) 
                options.geoSearch = $.extend(ls.geoSearch, options.geoSearch);
            if (options.searchParams)                
                options.searchParams = $.extend(ls.searchParams, options.searchParams);
            if (options.dates)
                options.dates = $.extend(true, ls.dates, options.dates);
            if (options.facets) 
                options.facets = $.extend(ls.facets, options.facets);
            if (options.facetsApplied) 
                options.facetsApplied = $.extend(true, ls.facetsApplied, options.facetsApplied);
            if (options.results) 
                options.results = $.extend(true, ls.results, options.results);
            if (options.urlParameters) 
                options.urlParameters = $.extend(ls.urlParameters, options.urlParameters);
                if (options.orderbyOptions)
                options.orderbyOptions = $.extend(ls.orderbyOptions, options.orderbyOptions);

            ls = $.extend(ls, options);

            ls.searchParams.top = ls.results.pager.pageSize;

            local.currentPage = (ls.searchParams.skip / ls.searchParams.top) + 1;

            local.clearAllAdded = $(ls.facetsApplied.container).length > 0 && $(ls.facetsApplied.container).children('.clear-all-facets').length > 0;

            local.queryText = ls.searchParams.search;

            checkUrlParameters();
        }

        // we will reset the local date value
        // because sometimes the date can be cleared
        // by another function
        local.fromDate = null;
        local.toDate = null;
        local.dateSearch = false;
        
        if (ls.dates.hasDates) {
            setupDateFields();
        }

        switch (action) {
            case "search":
                search();
                break;
            case "resetFacets":
                ls.facetsSelected = [];
                ls.facets.onFacetSelect.call(ls.facetsSelected);
                search();
                break;
        }

        if (!local.initialized) {
            //Check active facets
            $(ls.facetsSelected).each(function (i, v) {
                ls.facets.onFacetSelect.call([v]);
            });

            if (ls.orderbyOptions.orderbySelector) {
                $(document).on(ls.orderbyOptions.orderbyEvent, ls.orderbyOptions.orderbySelector, ls.orderbyOptions.onOrderbyChange);
            }
        }

        // setup public functions

        this.loadAdditionalFacets = loadFacets;

        local.initialized = true;

        // return
        return this;

    };

    /**
     * Handlers
     */

    function processAddress(data) {
        debug('Google Geocode return:');
        debug(data);

        var ret = null;

        if (data.status === "OK" && data.results.length > 0) {
            ls.geoSearch.lat = data.results[0].geometry.location.lat;
            ls.geoSearch.lng = data.results[0].geometry.location.lng;
        }

        local.waitingLatLong = false;
        search();
    }

    function processResults() {
        var data = this;

        loadFacets(data);
        loadResults(data);
        // render pager  
        if (data['@odata.count'] > ls.results.pager.pageSize) {
            renderPager(data);
        }    
        ls.onLoad.call(data, local);
    }

    /**
     * Content Functions
     */

    //Display the results
    function loadResults(data) {
        var rs = ls.results;
        var ldr = $(rs.loaderContainer);
        var c = $(rs.container) ? $(rs.container) : $(local.container);

        if (!c || !data["value"])
            return;

        renderResultsMessage(data['@odata.count']);

        //Clear the container if skip is 0 or if the clear is forced by setting
        if ((!rs.pager.loadMore && !rs.pager.infinite) || ls.searchParams.skip === 0)
            c.html('');

            if (rs.pager.infinite && !local.rendered)
                c.attr('role', 'feed').attr('aria-busy', 'true');

        if (data['@odata.count'] === 0) {

            // hide Loader
            if (ldr)
                ldr.fadeOut();
            $('<div/>').addClass('search-no-results ' + rs.noResultsClasses).text(rs.labels.noResults).appendTo(c);
        }

        $(data["value"]).each(function (i, v) {
            var itemIndex = i;
            //Populate the results
            if (!rs.template) {
                //Without a template, just display all the fields with some content
                var l = $('<ul/>');
                var hr = $('<hr/>');
                $(Object.keys(v)).each(function (j, k) {
                    if (!v[k] || v[k] === '')
                        return true;
                    var item = $('<li/>').text(k + ' : ').appendTo(l);
                    $('<strong/>').text(v[k]).appendTo(item);
                });
                l.appendTo(c);
                hr.appendTo(c);

                //Callback on create
                rs.onCreate.call(l);
            } else {
                //With template
                var t = $('<div>' + rs.template + '</div>');
                $(':not([data-search-field=""])', t).each(function (y, z) {
                    var field = $(z).data('searchField');
                    var value = '';
                    if (field && v[field]) {
                        value = v[field];
                    } else if (field === ls.geoSearch.fieldName && local.isGeoSearch) {
                        if (v[ls.geoSearch.azureFieldName]) {
                            var geo = v[ls.geoSearch.azureFieldName];
                            value = distance(
                                ls.geoSearch.lat, ls.geoSearch.lng,
                                geo.coordinates[1], geo.coordinates[0],
                                ls.geoSearch.unit);
                        }
                    }

                    //Format the data using the provided Callback function
                    var format = $(z).data('searchValueFormat');
                    if (format && window[format])
                        value = window[format](value, v, i);

                    if (field) {                        
                        if (typeof $(z).data('searchValueFormatReplace') !== 'undefined') {
                            $(z).replaceWith(value);
                        } else {
                            $(z).html(value);
                        }
                    }

                });

                c.append(t.children());
                // fade out loader
                if (ldr)
                    ldr.fadeOut();

                //Callback on create
                rs.onCreate.call(t);
            }
        });

        if (rs.pager.infinite)
            c.attr('aria-busy', 'false');

        c.fadeIn();
        local.rendered = true;

    }


    function renderResultsMessage(count) {

        var rs = ls.results;
        var c = $(rs.resultsMsgContainer);

        if (!c) {
            return;
        }

        c.empty();

        var cText = '<span class="query-count">' + count + '</span>';
        var sText = '<span class="page-count">' + local.currentPage * rs.pager.pageSize + '</span>';
                
        var pBottom = local.currentPage;
        var pTop = local.currentPage * rs.pager.pageSize;
        if (pBottom > 1) {
            pBottom = (local.currentPage - 1) * rs.pager.pageSize;
        }
        if (pTop > local.totalResults) {
            pTop = local.totalResults;
        }

        var pBottomText = '<span class="page-count">' + pBottom + '</span>';
        var pTopText = '<span class="page-count">' + pTop + '</span>';

        var msgText = rs.labels.haveResults;

        if (local.queryText || local.queryTextName) {

            var qText = '<span class="query-text">' + jsEscapeSearchTerm(local.queryText) + '</span>';
            var nText = '<span class="query-text">' + jsEscapeSearchTerm(local.queryTextName) + '</span>';

            //var msgText = '';
            if (local.queryText && local.queryTextName) {
                msgText = rs.labels.haveQueryAndName;
            } else if (local.queryText && !local.queryTextName) {
                msgText = rs.labels.haveQuery;
            } else if (!local.queryText && local.queryTextName) {
                msgText = rs.labels.haveName;
            }
            msgText = msgText.replace('{name}', nText).replace('{query}', qText);
        }

        msgText = msgText.replace('{count}', cText).replace('{showing}', sText).replace('{currPage}', local.currentPage).replace('{totalPages}', local.totalPages).replace('{pbottom}', pBottomText).replace('{ptop}', pTopText);
        
        var msg = $('<span/>').append(msgText);

        c.empty().fadeOut(function () {
            msg.appendTo(c);
            c.fadeIn();
        });

    }
    
    /**
     * 
     * @param {*} data is the response data from azure
     * 
     */
    function renderPager(data) {
        
        var pg = ls.results.pager;

        if (pg.appendPager) {     
            var pg_c = $(pg.container);
            pg_c.empty();

            if (!local.pagerRendered) {

                local.pagerRange[0] = 1;
                local.pagerRange[1] = pg.pagerRangeIncrement;

                if (local.currentPage >= pg.pagerRangeIncrement) {
                    local.pagerRange[0] = Math.floor(local.currentPage / pg.pagerRangeIncrement) * pg.pagerRangeIncrement;
                    local.pagerRange[1] = (Math.floor(local.currentPage / pg.pagerRangeIncrement) + 1) * pg.pagerRangeIncrement;
                }

            }
            generatePagerLinks(); 

            pg_c.fadeIn();
            local.pagerRendered = true;
        }        
    }

    /**
     * 
     */
    function generatePagerLinks() {

        var pg = ls.results.pager;
        var c = $(pg.container);

        if (!c)
            return;

        
        if (pg.loadMore || pg.infinite) {
            
            c.append(addPagerButton('load'));
            
        } else {         
            var items = '';
            if (pg.pagerEnders) {
                c.append(addPagerButton('first'));
            }
            c.append(addPagerButton('prev'));

            if (pg.pagerItems) {
                if(!local.pagerRendered) {
                    items = $('<div/>').addClass('pager-nav-items');
                } else {
                    items = $('.pager-nav-items').empty();
                }

                var i = local.pagerRange[0];
                while(i <= local.pagerRange[1] && i <= local.totalPages) {
                    var pagerLink = $('<a href="#">').data('targetPage', i);
                    if(i === local.currentPage) {
                        pagerLink = $('<span>').addClass('pager-nav-item-current');
                        pagerLink.attr('title', pg.labels.ada.current + ' ' + i);
                    } else {
                        pagerLink.attr('title', pg.labels.ada.item + ' ' + i);
                    }
                    pagerLink.addClass('pager-nav-item').text(i);
                    items.append(pagerLink);
                    i++;
                }
            }

            if (!c) {                
                c.append(addPagerButton('next'));
                if (pg.pagerEnders) {
                    c.append(addPagerButton('last'));
                }
                $(local.container).after(c);
            } else {
                c.append(items);            
                c.append(addPagerButton('next'));
                if (pg.pagerEnders) {
                    c.append(addPagerButton('last'));
                }
            } 

        }

        if (!local.pagerListenersAdded) {
            addPagerListeners();
        }

        // c;
    }

    /**
     * 
     * @param {string} type what type of pager button
     * 
     */
    function addPagerButton(type) {

        var pg = ls.results.pager;
        var button = $('<a/>').addClass('pager-navs').addClass('pager-' + type).attr('href', '#').attr('title', pg.labels.ada[type]);

        button.append($('<span/>').addClass('pager-navs-label').text(pg.labels[type]));

        if (pg.classes[type]) {
            button.addClass(pg.classes[type]);
        }

        if (type === 'first') {
            button.data('targetPage', 1);
        } else if (type === 'last') {
            button.data('targetPage', local.totalPages);
        }

        //button;
        if (local.pagerRendered) {
            button = $('.pager-navs.pager-' + type);
        }

        if (pg.infinite && (local.pagerInifiniteClicked || !pg.infiniteClick)) {
            button.addClass('pager-load-infinite');
        }
        
        if (type === 'prev' || type === 'first') {
            if (local.currentPage > 1) {
                button.data('disabled', false).removeClass('disabled');
            } else {
                button.data('disabled', true).addClass('disabled');
            }
        } else {
            if (local.totalPages > local.currentPage) {
                button.data('disabled', false).removeClass('disabled');
            } else {
                button.data('disabled', true).addClass('disabled');
            }        
        }

        return button;

    }

    /**
     * 
     */
    function addPagerListeners() {

        var pg = ls.results.pager;
        //var c = $(pg.container);

        if (pg.loadMore || pg.infinite) {

            $(document).on('click', '.pager-load', function (e) {
                e.preventDefault();
                if (!$(this).data('disabled')) {
                    handlePager($(this).hasClass('pager-prev'));
                    if (pg.infinite && pg.infiniteClick) {
                        local.pagerInifiniteClicked = true;
                    }
                }
            });

            if (pg.infinite) {

                var scrollTrigger = $('.pager-load');

                if (!pg.infiniteClick) {
                    local.pagerInifiniteClicked = true;
                }

                $(window).on('resize scroll', function () {

                    if (isInViewport(scrollTrigger, 150) && local.pagerInifiniteClicked && !scrollTrigger.data('disabled')) {
                        handlePager(scrollTrigger.hasClass('pager-prev'));
                    }
                });
            }

        } else {
            $(document).on('click', '.pager-prev, .pager-next', function (e) {
                e.preventDefault();
                if (!$(this).data('disabled')) {
                    handlePager($(this).hasClass('pager-prev'));
                }
            });
            $(document).on('click', '.pager-last, .pager-first', function (e) {
                e.preventDefault();
                if (!$(this).data('disabled')) {
                    skipToPage($(this).data('targetPage'));
                }
            });
            $(document).on('click', '.pager-nav-items a', function (e) {
                e.preventDefault();
                skipToPage($(this).data('targetPage'));
            });
        }

        local.pagerListenersAdded = true;
    }

    /**
     * 
     * @param {*} next 
     */
    function handlePager(next) {
        var pg = ls.results.pager; 

        if (pg.pageSize && local.currentPage && local.rendered) {        
            local.rendered = false;                
            // go to next page of results
            if (!next) {
                local.currentPage = local.currentPage + 1;
            } else {
                local.currentPage = local.currentPage - 1;
            }
            
            ls.searchParams.skip = (local.currentPage - 1) * pg.pageSize; 

            search();
        }
    }

    /**
     * 
     * @param {*} num 
     */
    function skipToPage(num) {
        local.currentPage = num;
        ls.searchParams.skip = (local.currentPage - 1) * ls.results.pager.pageSize;  
        search();            
    }

    //Default action when a facet receives a click
    function defaultFacetChange(e) {
        e.preventDefault();

        var fN = $(this).data('azuresearchFacetName');
        var fV = $(this).val() ? $(this).val() : $(this).data('azuresearchFacetValue');
        var fTf = $(this).data('azuresearchFacetTranslationField');
        var fTk = $(this).data('azuresearchFacetTranslationKey');
        var fop = $(this).data('azuresearchFacetOperator');


        var value = fop + '||' + fN + '||' + fV;

        if (fTf && fTk)
            value += '||' + fTf + '||' + fTk;

        // if the facet is a checkbox and we are unchecking it:
        if (e.type === 'change' && e.target.type === 'checkbox' && $(this).prop('checked') === false) {
            var sfs = ls.facetsApplied;
            removeFacet($('.' + sfs.class + '[data-value="' + value + '"]'));
        }
        // otherwise add the facet to the search
        else {

            if (ls.facetsSelected.indexOf(value) !== -1)
                return;

            ls.facetsSelected.push(value);
            ls.facetsApplied.onChange.call(ls.facetsSelected.slice(0));
            ls.facets.onFacetSelect.call(ls.facetsSelected.slice(0));
            ls.searchParams.skip = 0;
            local.currentPage = 1;
            search();
        }

    }

    //Default action when a facet is selected
    function defaultFacetSelect() {

        var rs = ls.results;
        var sfs = ls.facetsApplied;
        var fs = ls.facets;

        if (!sfs.container)
            return;

        var lastFacet = this.pop();
        var c = $(sfs.container);

        var lf = lastFacet.split('||');

        debug(lf);

        //Ignore if necessary
        if (sfs.ignoreFacets.indexOf(lf[1]) !== -1)
            return;
        
        if (rs.labels.activeFacets && !local.hasActiveFacets)
            c.prepend($('<span/>').addClass('selected-facet-label').text(rs.labels.activeFacets));

        var cc = null, cc_title = null, cc_titleElem = null; 

        var azField = lf[1];
        // get all facet dictionaries:
        var combinedFacetDictionary = ls.facetsDictionary.concat(local.additionalFacetsDictionary);

        if (c.find('.selected-facets-group[data-az-field="' + azField + '"]').length > 0 && sfs.groupFacetsByType) {            
            cc = c.find('.selected-facets-group[data-az-field="' + azField + '"]');
        } else if (sfs.groupFacetsByType) {                        
            cc = $('<div/>').addClass('selected-facets-group').attr('data-az-field', azField).appendTo(c);
                        
            cc_title = azField;

            // get facet label based on facet field:
            $.each(combinedFacetDictionary, function (k, v) {
                if (v.fieldName === lf[1]) {
                    cc_title = v.label;
                    return;
                } else {
                    return false;
                }
            });
            
            cc_titleElem = $('<span/>').addClass('selected-facets-group-title').text(cc_title).appendTo(cc);
        }    

        var facetLabel = lf[2];
    
        if (fs.translateFacets) {
            var fTf = lf[3] ? lf[3] : lf[1];
            var fTk = lf[4] ? lf[4] : lf[2];
            facetLabel = fs.translateFacets.call(fTf, fTk);
        }

        var selectedFacet = $('<a/>')
            .text(facetLabel)
            .attr({ 'href': '#' })
            .attr(sfs.extraAttributes)
            .data('value', lastFacet)
            .addClass(sfs.class)
            .on('click', function (e) {
                e.preventDefault();
                removeFacet($(this));
            });

            if (sfs.groupFacetsByType) {
                selectedFacet.appendTo(cc);
            } else {
                if (local.clearAllAdded) {
                    selectedFacet.insertBefore('.clear-all-facets');
                } else {
                    selectedFacet.appendTo(c);
                }

            }

            // clearAll
            if (sfs.clearAll.enabled && !local.clearAllAdded) {
                $('<a/>').text(sfs.clearAll.label)
                .attr({ 'href': '#' })
                .attr(sfs.extraAttributes)
                .addClass('clear-all-facets')
                .addClass(sfs.clearAll.className)
                .on('click', function (e) {
                    e.preventDefault();
                    local.clearAllAdded = false;
                    local.hasActiveFacets = false;
                    c.empty().hide();
                    ls.facetsSelected = [];
                    ls.searchParams.skip = 0;
                    local.currentPage = 1;
                    ls.facetsApplied.onChange.call(ls.facetsSelected);
                    
                    search();                
                })
                .appendTo(c);
                local.clearAllAdded = true;
            }

            local.hasActiveFacets = true;
            c.show();
    }

    // sfs_item = jquery object, for facet item to be removed
    function removeFacet(sfs_item) {
        var sfs = ls.facetsApplied;

        if (!sfs.container)
            return;

        var c = $(sfs.container);

        ls.facetsSelected
            .splice(
                ls.facetsSelected.indexOf(sfs_item.data('value')), 1
            );
        ls.searchParams.skip = 0;
        local.currentPage = 1;
        ls.facetsApplied.onChange.call(ls.facetsSelected.slice(0));
        // check if any facets exist other than this one
        if (ls.facetsApplied.groupFacetsByType && sfs_item.parent('.selected-facets-group[data-az-field="' + fs[1] + '"]').children('.selected-facet').length <= 1) {
            sfs_item.parent('.selected-facets-group[data-az-field="' + fs[1] + '"]').remove();
        } else {
            sfs_item.remove();
        }

        if (!(c.children().not('.clear-all-facets, .selected-facet-label').length > 0)) {
            local.hasActiveFacets = false;
            local.clearAllAdded = false;
            c.empty().hide();
        }

        search();
    }

    // Load the facets according to the results
    /*** this function is public ****/
    /* so that facets can be rendered outside of a search request */    
    function loadFacets(data, fs, _fd) {
        
        if (!fs)
            fs = ls.facets;

        if (!_fd) {
            _fd = ls.facetsDictionary;
        }

        var c = $(fs.container);

        //Check if the containers was defiend and if the facets were part of the results
        if (!c || !data["@search.facets"])
            return;

        c.html('');
        
        $.each(_fd, function (i, v) {

            var _fsNm = v.fieldName;
                       
            if (data["@search.facets"][_fsNm]) {

               //Facet's Title
               var tt = v;
               if (typeof v === 'object' && v.label) {
                   tt = v.label;
               } else {
                   tt = _fsNm;
               }

                var title = $(fs.title).addClass(fs.titleClass).text(tt);

                if (fs.titleWrapper) {
                    title = $(fs.titleWrapper).addClass(fs.titleWrapperClass).append(title);
                }

                c.append(title);

                title.on('click', fs.titleOnClick);

                //Facets container
                var w = $(fs.wrapperContainer).addClass(fs.wrapperContainerClass);
                c.append(w);

                if (typeof v === 'object' && v.tagname === "select") {
                    renderFacetSelect(w, title, data, _fsNm, v, fs);
                }
                else {
                    renderFacetList(w, title, data, _fsNm, v, fs);
                }
                
            }


        });
    }
    
    // render facet as dropdown select instead
    // of links
    function renderFacetSelect(w, title, data, v, dicationary, fs) {

        if (!fs)
            fs = ls.facets;

        var c = $(fs.container);

        var control = $('<select />')
            .data('azuresearchFacetName', v)
            .on('change', fs.facetOnClick)
            .append($('<option />')
            .text('Select'));

        w.append(control);

        var countFacets = 0;
        
        var facetList = data["@search.facets"][v];

        if (fs.sortFacets)
            facetList = fs.sortFacets.call(this, v, data["@search.facets"][v]);


        //Facets
        $(facetList).each(function (j, k) {

            if (!k.label && fs.translateFacets) {
                // call translation function if it exists on the facet dictionary
                // send the field name, and the value key
                k['label'] = fs.translateFacets.call(this, v, k.value);
            }
            
            var facetLabel = k.label ? k.label : k.value;

            //Create the facet
            var f = $('<option />')
                // .addClass(fs.facetClass)
                .text(facetLabel)
                .attr('value', k.value)
                .data('azuresearchFacetName', v);

            // setup custom translation
            if (k.translation_field && k.translation_key) {
                f.data('azuresearchFacetTranslationField', k.translation_field);
                f.data('azuresearchFacetTranslationKey', k.translation_key);
            }

            //Counter
            if (fs.showCount && k.count) {
                f.text(f.text() + " (" + k.count + ")");
            }
            
            //Do not display selected facets
            if (ls.facetsSelected.indexOf(v + '||' + k.value) !== -1) {
                f.attr("selected", "selected");
            }            
            control.append(f);

            countFacets++;
        });

         //Group Wrapper
         if (fs.groupWrapper && countFacets > 0) {
            var gw = $(fs.groupWrapper).addClass(fs.groupWrapperClass);
            c.append(gw);
            title.appendTo(gw);
            w.appendTo(gw);
        }

        if (countFacets === 0) {
            title.remove();
            w.remove();
        }
    }

    // render facet list as links
    function renderFacetList(w, title, data, v, dicationary, fs) {
        
        if (!fs)
            fs = ls.facets;

        var c = $(fs.container);

        var tagName, searchOp;

        if (typeof dicationary === 'object') {
            tagName = dicationary.tagname;
            searchOp = dicationary.operator;
        }

        var countFacets = 0;

        var facetList = data["@search.facets"][v];

        if (fs.sortFacets)
            facetList = fs.sortFacets.call(this, v, data["@search.facets"][v]);

        //Facets
        $(facetList).each(function (j, k) {
            var fs = ls.facets;
            if (!k.label && fs.translateFacets) {
                // call translation function if it exists on the facet dictionary
                // send the field name, and the value key
                k['label'] = fs.translateFacets.call(this, v, k.value);
            }

            var f = createFactListItem(k, v, tagName, searchOp);

            if (fs.wrapper) {
                var facetItemWrapper = $(fs.wrapper).addClass(fs.wrapperClass);
                facetItemWrapper.append(f).appendTo(w);
            }
            else {
                w.append(f);
            }

            if (k.children) {
                $(k.children).each(function (_k, _v) {

                    if (fs.translateFacets && !_v.label) {
                        // call translation function if it exists on the facet dictionary
                        // send the field name, and the value key
                        k['label'] = fs.translateFacets.call(this, v, _v.value);
                    }
                    var _f = createFactListItem(_v, v, tagName, searchOp);
                    if (facetItemWrapper) {
                        facetItemWrapper.addClass('has-child-facets');
                        $(fs.wrapper).addClass(fs.wrapperClass).append(_f).appendTo(facetItemWrapper);
                        if (facetItemWrapper.find('.active-facet').length > 0) {
                            facetItemWrapper.addClass('expanded');
                        }
                    }
                });
            }

            countFacets++;
        });
        
        //Group Wrapper
        if (fs.groupWrapper && countFacets > 0) {
            var gw = $(fs.groupWrapper).addClass(fs.groupWrapperClass);
            c.append(gw);
            title.appendTo(gw);
            w.appendTo(gw);
        }

        if (countFacets === 0) {
            title.remove();
            w.remove();
        }

    }

    function createFactListItem(k, v, el, op) {


        var fs = ls.facets;

        // if no search operator specified
        // use the default configured
        if (!op)
            op = fs.searchMode;

        //Create the facet
        var facetData = op + '||' + v + '||' + k.value;
        var facetLabelText = k.label ? k.label : k.value;
        var facetLabel = facetLabelText;
        //Counter
        if (fs.showCount && k.count)
            facetLabel += ' <span class="facet-count">(' + k.count + ')</span>';


        var f;
        if (el === 'radio' || el === 'checkbox') {

            let f_id = v + '_' + k.value.replace(/\W/g, '');

            f = $('<input />')
                .on('change', fs.facetOnClick)
                .attr({ type: el, name: v, id: f_id, value: k.value });
            var _l = $('<label />').html(facetLabel).attr('for', f_id).attr('title', fs.facetAltText + facetLabelText);
            var f_wrap = $('<div>').append(f).append(_l);
        } else {

            f = $('<a href=\"#\"/>')
                .on('click', fs.facetOnClick)
                .attr('title', fs.facetAltText + facetLabelText)
                .html(facetLabel);
        }

        // set search data on facet elem
        f.addClass(fs.facetClass).data('azuresearchFacetName', v).data('azuresearchFacetValue', k.value).data('azuresearchFacetOperator', op);

        // setup custom translation
        if (k.translation_field && k.translation_key) {
            f.data('azuresearchFacetTranslationField', k.translation_field);
            f.data('azuresearchFacetTranslationKey', k.translation_key);
            facetData += '||' + k.translation_field + '||' + k.translation_key;
        }

        // add active class to facet item
        if (ls.facetsSelected.indexOf(facetData) !== -1) {
            f.addClass('active-facet');
            if (el === 'radio' || el === 'checkbox') {
                f.prop('checked', true);
            }
        }

        if (typeof f_wrap !== 'undefined') {
            return f_wrap;
        } else {
            return f;
        }


    }


    /**
     * Setup Date fields to filter results
     * based on a date range
     */
    function setupDateFields() {
        
        var df = ls.dates.fields;

        if (!df.from.selector || !df.from.indexField)
            return;
        
        var fs = df.from.selector;

        if (df.to.selector && df.to.indexField && df.from.selector) {
            fs += ', ' + df.to.selector;
        } else if (df.to.selector && df.to.indexField) {
            fs = df.to.selector;
        }

        var fs_elem = $(fs);
        
        // if the element has a value on load,
        // handle this now
        fs_elem.each(function (k, v) {
            if ($(v).val()) {
                setDateFilter($(v).val(), $(v).data('dateDir'));
            }
        });

        fs_elem.on('change', function (e) {
            handleDateInput();
        });
        
        fs_elem.on('keydown', function (e) {
            // search on return press
            if (e.which === 13) {
                e.preventDefault();
                handleDateInput();
            } 
            // clear field and search on backspace/delete
            else if (e.which === 8 || e.which === 46) {
                e.preventDefault();
                $(this).val('');
                handleDateInput();
            }
        });

        function handleDateInput() {

            fs_elem.each(function (k, v) {
                setDateFilter($(v).val(), $(v).data('dateDir'));
            });

            ls.searchParams.skip = 0;
            local.currentPage = 1;
            search();
        }

        function setDateFilter(val, dir) {
            local[dir] = null;
            if (val && dir) {
                var timeString = '00:00:00';

                // the OPL date format is dd/MM/yyyy
                // so we will have to parse that date first
                // to change to yyyy-MM-dd
                var dateParts = val.split('/');
                var dateYear = parseInt(dateParts[2]);
                var dateMonth = parseInt(dateParts[1]) - 1;
                var dateDay = parseInt(dateParts[0]);
                var dateObj = new Date(dateYear, dateMonth, dateDay, 0, 0, 0, 0);

                if (dir === 'toDate') {
                    dateObj.setHours(23, 59, 59, 999);
                } 
                
                local[dir] = dateObj;
            }

            if (local.fromDate || local.toDate) {
                local.dateSearch = true;
            } else {
                local.dateSearch = false;
            }
        }
        
    }

    // change search orderby option
    function defaultOrderbyChange(e) {

        var searchField = $(this).data('searchField');
        var searchDir = $(this).data('searchDir');

        if ($(this)[0].nodeName === 'SELECT') {
            searchField = $(this).find(':selected').data('searchField');
            searchDir = $(this).find(':selected').data('searchDir');
        }

        //reset to first page of results when
        // changing orderby clause
        ls.searchParams.skip = 0;
        //ls.searchParams.orderby = searchField + ' ' + searchDir;
        ls.searchParams.orderby = '';
        searchField.split(';').forEach(function (v, i, arr) {
            if (i > 0)
                ls.searchParams.orderby += ', ';
            ls.searchParams.orderby += v + ' ' + searchDir;
        });

        search();
    }

    /**
     * External API Calls
     */

    //Execute the AJAX call to Azure Search
    function search() {

        if (ls.results.pager.updateHistory) {
            updatePageHistory();   
        }
        
        if (ls.facetsApplied.updateHistory) {
            updateFacetHistory();
        }
        // reset returned params object so it can be updated
        local.returnedParams = { groupedFacets: null, params: null, azureKeys: null };

        local.isGeoSearch = false;

        // show Loader
        if (ls.results.loaderContainer)
            $(ls.results.loaderContainer).fadeIn();

        // remove pager
        if (ls.results.pager.container)
            $(ls.results.pager.container).empty().fadeOut();

        // results message
        if (ls.results.resultsMsgContainer)
            $(ls.results.resultsMsgContainer).empty().fadeOut();

        local.pagerRendered = false;

        if (local.waitingLatLong)
            return;

        //Check if it's geo search
        if (ls.geoSearch.lat && ls.geoSearch.lng) {
            debug('Geo searching...');
            debug(ls.geoSearch.lat);
            debug(ls.geoSearch.lng);
            local.isGeoSearch = true;
            if (!ls.searchParams.orderby || ls.searchParams.orderby.indexOf(ls.geoSearch.fieldName) === 0) {
                var orderby = "geo.distance(" + ls.geoSearch.azureFieldName;
                orderby += ", geography'POINT(" + ls.geoSearch.lng + " " + ls.geoSearch.lat + ")')";
                if (ls.searchParams.orderby && ls.searchParams.orderby.indexOf(' desc') !== -1) orderby += ' desc';
                ls.searchParams.orderby = orderby;
            }
        }

        var f = null;
        //Save the current filter
        
        var previousFilter = ls.searchParams.filter;
        ls.searchParams['facets'] = [];
        if (ls.facetsDictionary.length > 0) {
            $(Object.keys(ls.facetsDictionary)).each(function (k, v) {
                var fieldParams = null;
                if (typeof ls.facetsDictionary[v] === 'object' && ls.facetsDictionary[v].params) {
                    fieldParams = ls.facetsDictionary[v].fieldName + ',';
                    fieldParams += ls.facetsDictionary[v].params;
                    ls.searchParams['facets'].push(fieldParams);
                }
            });
        }


        local.returnedParams.groupedFacets = null;

        //Apply Facet Filters
        if (ls.facetsSelected.length > 0) {
            var facetFilterText = '';
            // breakdown the selectedfacets array and organize by
            // operator "AND/OR" and by index field
            var groupedFacets = groupSelectedFacets();


            local.returnedParams.groupedFacets = groupedFacets;

            // iterate through both AND and OR groups
            $.each(groupedFacets, function (_fk, _fv) {

                // iterate through each facet search field key
                $.each(_fv, function (_fvk, _fvv) {

                    // iterate throgh each search filter value
                    var _fvvi = 0;
                    $.each(_fvv, function (_fvvk, _fvvv) {
                        // if we are doing an OR operation
                        // open a left bracket "(" to group all OR values
                        // associated with this search field
                        if (_fk === 'or' && _fvvi === 0) {
                            facetFilterText += ' and (';
                        }
                        // of we're outputting AND operations, proceed normally;
                        if (_fk === 'and' || _fvvi > 0)
                            facetFilterText += ' ' + _fk + ' ';

                        facetFilterText += _fvk + '/any(m: m eq \'' + _fvvv + '\')';

                        _fvvi++;
                    });
                    // close the OR operation for this field
                    if (_fk === 'or')
                        facetFilterText += ')';

                });

            });

            f = facetFilterText;

            if (previousFilter)
                f = ls.searchParams.filter + ' ' + f;

        }

        //Apply geo distance filter if configured
        if (local.isGeoSearch && ls.geoSearch.maxDistance) {
            debug('Filter Geo searching by distance : ' + ls.geoSearch.maxDistance);
            var geoFilter = "geo.distance(" + ls.geoSearch.azureFieldName + ", geography'POINT(" + ls.geoSearch.lng + " " + ls.geoSearch.lat + ")') le " + ls.geoSearch.maxDistance;
            if (f) {
                f += ' ' + ls.facets.searchMode + ' ' + geoFilter;
            } else {
                f = geoFilter;
                if (previousFilter)
                    f = ls.searchParams.filter + ' ' + ls.facets.searchMode + ' ' + f;
            }
        }        

        var date_f = "";
        if (local.dateSearch) {
            if (local.fromDate) {
                date_f = ls.dates.fields.from.indexField + ' ge ' + local.fromDate.toISOString();           
            } 

            if (local.toDate) {
                if (local.fromDate)
                    date_f += ' ' + ls.facets.searchMode + ' ';
                date_f += ls.dates.fields.to.indexField + ' le ' + local.toDate.toISOString();           
            }            

            if (f) {
                f += ' ' + ls.facets.searchMode + ' ' + date_f;
                
            } else {
                f = date_f;
                if (previousFilter)
                    f = ls.searchParams.filter + ' ' + ls.facets.searchMode + ' ' + f;
            }
        }

        if (f) {
            ls.searchParams.filter = f;
        }

        ls.searchParams.search = sanitizeSearchTerm(local.queryText);

        local.returnedParams.params = {
            search: ls.searchParams.search ? ls.searchParams.search : "*",
            filter: ls.searchParams.filter ? ls.searchParams.filter : "",
            orderby: ls.searchParams.orderby ? ls.searchParams.orderby : "",
            queryType: ls.searchParams.queryType ? ls.searchParams.queryType : "simple",
            searchMode: ls.searchParams.searchMode ? ls.searchParams.searchMode : "all",
            searchFields: ls.searchParams.searchFields ? ls.searchParams.searchFields : ""
        };

        local.returnedParams.azureKeys = ls.azureSearch;

        debug(local.returnedParams);

        var settings = {
            "crossDomain": true,
            "url": ls.azureSearch.url,
            "method": "POST",
            "headers": {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "api-key": ls.azureSearch.key,
                "Cache-Control": "no-cache"
            },
            "data": JSON.stringify(ls.searchParams)
        };

        $.ajax(settings).done(function (response) {
            local.totalResults = ls.searchParams.count && response['@odata.count'] ? response['@odata.count'] : -1;
            local.totalPages = Math.ceil(local.totalResults / ls.results.pager.pageSize);
            ls.onResults.call(response, local);
        });

        //Return the filter to the original state
        ls.searchParams.filter = previousFilter;
    }


    // resolve address text to Lat/Lng values from geocoding api
    function resolveAddress(address) {
        var s = ls.googleGeocodeApi;

        if (!s.key)
            return;

        local.waitingLatLong = true;

        //Key
        var url = s.url;
        url += url.indexOf('?') !== -1 ? '&' : '?';
        url += 'key=' + s.key;
        url += '&address=' + address;
        url += '&language=' + s.language;

        $.getJSON(url, processAddress);
    }

    /**
     * Utility Functions
     */

    /**
     * breakdown the selectedfacets array and organize by
     * operator "AND/OR" and by index field
     *
     * @returns {object} grouped facet list
     * 
     * */
    function groupSelectedFacets() {

        var groupedFacets = {};

        ls.facetsSelected.forEach(function (item, _i) {
            var p = item.split('||');
            // set operator based on facet configuration
            if (typeof groupedFacets[p[0]] === 'undefined')
                groupedFacets[p[0]] = {};

            if (typeof groupedFacets[p[0]][p[1]] === 'undefined')
                groupedFacets[p[0]][p[1]] = [];

            groupedFacets[p[0]][p[1]].push(p[2]);


        });

        return groupedFacets;

    }

    /**
     *
     * @param {object} elem is a jquery element "$(selector)"
     * @param {int} offset is the vertical offset of the listener
     *
     * @returns {boolean} whether element is in viewport or not
     */
    function isInViewport(elem, offset) {

        if (typeof offset === 'undefined') {
            offset = 0;
        }

        var elementTop = elem.offset().top;
        var elementBottom = elementTop + elem.outerHeight();
        var viewportTop = $(window).scrollTop();
        var viewportBottom = viewportTop + $(window).height() - offset;

        return elementBottom > viewportTop && elementTop < viewportBottom;

    }


    //Calculate the distance between two geo points
    function distance(lat1, lon1, lat2, lon2, unit) {

        var radlat1 = Math.PI * lat1 / 180;
        var radlat2 = Math.PI * lat2 / 180;
        var theta = lon1 - lon2;
        var radtheta = Math.PI * theta / 180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit === "K") { dist = dist * 1.609344; }
        if (unit === "N") { dist = dist * 0.8684; }
        return dist;
    }

    // Log messages to console when debug enabled.
    function debug(obj) {
        if (ls.debug && window.console && window.console.log) {
            window.console.log(obj);
        }
    }

    //Get query string parameters
    function query(sParam) {

        if (!sParam)
            return null;

        var sPageURL = window.location.search.substring(1),
            sURLVariables = sPageURL.split(/(\&){1}(?!\&)/gi),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1].replace(/\+/g, " "));
            }
        }
        return null;
    }

    // Check the configured url parameters for values
    function checkUrlParameters() {
        var s = ls.urlParameters;

        var address = query(s.address),
            latitude = query(s.latitude),
            longitude = query(s.longitude),
            latlong = query(s.latlong),
            search = query(s.search),
            facets = query(s.facets),
            page = query(s.page);

        /*
        
            facets: 'fc',
            page: 'p', */

        //Split LatLong
        if (latlong && latlong.indexOf(',') !== -1) {
            latitude = latlong.split(',')[0];
            longitude = latlong.split(',')[1];
        }

        //Apply Parameters
        if (search) {
           local.queryText = search;   
        }

        if (page && ls.results.pager.updateHistory) {
            local.currentPage = Math.floor(parseFloat(page));
            if (ls.results.pager.loadMore || ls.results.pager.infinite) {
                ls.searchParams.skip = 0;
                ls.searchParams.top = local.currentPage * ls.results.pager.pageSize;
            } else {
                ls.searchParams.skip = (local.currentPage - 1) * ls.results.pager.pageSize;
            }            
        }

        if (facets) {
            ls.facetsSelected = facets.split(';');
        }
        
        if (latitude && longitude) {
            ls.geoSearch.lat = latitude;
            ls.geoSearch.lng = longitude;
        }

        //Check is is necessary to resolve the address
        if (address && !latitude && !longitude && !latlong) {
            var r = resolveAddress(address);
            if (r) {
                latitude = r[0];
                longitude = r[1];
            }
        }

    }

    // update the current page query string for active facets
    function updateFacetHistory() {
            
        var facetParam, urlInit, urlNew, facetString, updatedHistoryUrl;
        urlInit = window.location.pathname + window.location.search;
        facetParam = ls.urlParameters.facets;
        // check to see if facets are already in the
        // query string, and if so, remove them
        if (urlInit.indexOf(facetParam) > -1) {
            urlNew = updateUrlParameter(urlInit, facetParam);
        } else {
            urlNew = urlInit;
        }
        // check to see if facets have been 
        // applied to the search options
        // and if so, add them to the query string
        if (ls.facetsSelected.length > 0) {     
            
            // facetString = .toString();
            facetString = '';
            $.each(ls.facetsSelected, function (k, v) {
                if (k > 0) {
                    facetString += ';';
                }
                facetString += encodeURIComponent(v.toString());
            });                
            updatedHistoryUrl = urlNew;
            updatedHistoryUrl += urlNew.indexOf('?') > -1 ? '&' : '?';
            updatedHistoryUrl += facetParam + '=' + facetString;
        } else {
            updatedHistoryUrl = urlNew;
        }  
        // push the new search query string to the browser history
        window.history.replaceState({ 'url' : updatedHistoryUrl }, '', updatedHistoryUrl.replace(/%3Cscript%3E/g, ''));     
    }

    // update the current page query string for pagination
    function updatePageHistory() {
        
        var urlInit, urlNew, pageParam, pageVal, updatedHistoryUrl;
        urlInit = window.location.pathname + window.location.search;
        pageParam = ls.urlParameters.page;
        // check to see if facets are already in the
        // query string, and if so, remove them
        if (urlInit.indexOf(pageParam) > -1) {
            urlNew = updateUrlParameter(urlInit, pageParam);
        } else {
            urlNew = urlInit;
        }
        // check to see if facets have been 
        // applied to the search options
        // and if so, add them to the query string
        if (local.currentPage > 1) {                
            // facetString = .toString();
            pageVal = local.currentPage.toString();
                          
            updatedHistoryUrl = urlNew;
            updatedHistoryUrl += urlNew.indexOf('?') > -1 ? '&' : '?';
            updatedHistoryUrl += pageParam + '=' + pageVal;
        } else {
            updatedHistoryUrl = urlNew;
        }  
        // push the new search query string to the browser history
        window.history.replaceState({ 'url' : updatedHistoryUrl }, 'page', updatedHistoryUrl.replace(/%3Cscript%3E/g, ''));     
    }

    //append or update query string parameters
    function updateUrlParameter(uri, key, value) {
        // remove the hash part before operating on the uri
        var i = uri.indexOf('#');
        var hash = i === -1 ? '' : uri.substr(i);
        uri = i === -1 ? uri : uri.substr(0, i);

        var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
        var separator = uri.indexOf('?') !== -1 ? "&" : "?";

        if (!value) {
            // remove key-value pair if value is empty
            uri = uri.replace(new RegExp("([?&]?)" + key + "=[^&]*", "i"), '');
            if (uri.slice(-1) === '?') {
                uri = uri.slice(0, -1);
            }
            // replace first occurrence of & by ? if no ? is present
            if (uri.indexOf('?') === -1) {
                uri = uri.replace(/&/, '?');
            }
        } else if (uri.match(re)) {
            uri = uri.replace(re, '$1' + key + "=" + value + '$2');
        } else {
            uri = uri + separator + key + "=" + value;
        }
        return uri + hash;
    }

    //sanitze search term so it can be sent to azure search
    function sanitizeSearchTerm(_term) {
        
        var wildcardOperator = '*';
        var termText = _term;
        
        if (_term) {

            var _searchTerm = _term.trim().replace(/[\\]{1}/gi, '\\').replace(/[\"]{1}/gi, '\$&').replace(/[\~\?\*\:\/\^\[\]\(\)\{\}\!\+\-]{1}/gi, ' ').replace(/(\s\&\s)/gi, ' \\& ').replace(/(\&){2}/gi, '\\$&').replace(/(\|){2}/gi, '\\$&').trim();
            
            termText = '(' + _searchTerm + ')';

            if (_term.indexOf('"') === -1) {

                // Check if the term starts with a quotation mark
                // and if not, apply quotes and use proximity search
                if (ls.searchParams.queryType === 'full' && ls.azureSearch.useTermProximity) {
                    var _proximitySearchTerm = '\"' + _searchTerm + '\"~' + ls.azureSearch.termProximityDistance;
                    termText += ' | (' + _proximitySearchTerm + ')';
                }

                // add fuzzy search results
                if (ls.searchParams.queryType === 'full' && ls.azureSearch.isFuzzy && ls.azureSearch.fuzzyProximity > 0) {
                    var _fuzzySearchTerm = _searchTerm.replace(/[\s^]+(?=([^\"]*\"[^\"]*\")*[^\"]*$)(?=([^\']*\'[^\']*\')*[^\']*$)/gi, '~' + ls.azureSearch.fuzzyProximity + ' ') + '~' + ls.azureSearch.fuzzyProximity;
                    termText += ' | (' + _fuzzySearchTerm + ')';
                }

                // add wildcard or prefix search results
                if (ls.azureSearch.isWildcard) {
                    const _wildcardSearchText = _searchTerm.replace(/[\s^]+(?=([^\"]*\"[^\"]*\")*[^\"]*$)(?=([^\']*\'[^\']*\')*[^\']*$)/gi, '* ') + '*';
                    termText += ' | (' + _wildcardSearchText + ')';
                }


            }


        }

        return termText;

    }

    function jsEscapeSearchTerm(_term) {
        return $('<textarea/>').text(_term).html();
    }

}(jQuery));


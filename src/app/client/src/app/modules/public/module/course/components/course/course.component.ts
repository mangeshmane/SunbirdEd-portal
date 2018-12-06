import { combineLatest, Subject, of, Observable } from 'rxjs';
import { PageApiService, OrgDetailsService, FormService, UserService } from '@sunbird/core';
import { Component, OnInit, OnDestroy, EventEmitter } from '@angular/core';
import {
  ResourceService, ToasterService, INoResultMessage, ConfigService, UtilService, ICaraouselData, BrowserCacheTtlService, ServerResponse
} from '@sunbird/shared';
import { Router, ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
import { IInteractEventEdata, IImpressionEventInput } from '@sunbird/telemetry';
import { CacheService } from 'ng2-cache-service';
import { PublicPlayerService } from './../../../../services';
import { takeUntil, map, mergeMap, first, filter, catchError } from 'rxjs/operators';

@Component({
  templateUrl: './course.component.html',
  styleUrls: ['./course.component.scss']
})
export class CourseComponent implements OnInit, OnDestroy {

  public showLoader = true;
  public noResult = false;
  public showLoginModal = false;
  public baseUrl: string;
  public noResultMessage: INoResultMessage;
  public carouselData: Array<ICaraouselData> = [];
  public filterType: string;
  public queryParams: any;
  public hashTagId: string;
  public unsubscribe$ = new Subject<void>();
  public telemetryImpression: IImpressionEventInput;
  public inViewLogs = [];
  public sortIntractEdata: IInteractEventEdata;
  public prominentFilters: any = {};
  public dataDrivenFilter = new EventEmitter();
  public frameWorkName: string;
  public initFilters = false;

  constructor(private pageApiService: PageApiService, private toasterService: ToasterService,
    public resourceService: ResourceService, private configService: ConfigService, private activatedRoute: ActivatedRoute,
    public router: Router, private utilService: UtilService, private orgDetailsService: OrgDetailsService,
    private publicPlayerService: PublicPlayerService, private cacheService: CacheService,
    private browserCacheTtlService: BrowserCacheTtlService, private userService: UserService, public formService: FormService) {
    this.router.onSameUrlNavigation = 'reload';
    this.filterType = this.configService.appConfig.exploreCourse.filterType;
    this.setTelemetryData();
  }

  ngOnInit() {
    combineLatest(
      this.orgDetailsService.getOrgDetails(this.activatedRoute.snapshot.params.slug),
      this.getFrameWork()
    ).pipe(
      mergeMap((data: any) => {
        this.hashTagId = data[0].hashTagId;
        if (data[1]) {
          this.initFilters = true;
          this.frameWorkName = data[1];
          return this.dataDrivenFilter;
        } else {
          return of({});
        }
      }), first()
    ).subscribe((filters: any) => {
        this.prominentFilters = filters;
        this.fetchContent();
        this.setNoResultMessage();
      },
      error => {
        this.router.navigate(['']);
      }
    );
  }
  public getFilters(filters) {
    const defaultFilters = _.reduce(filters, (collector: any, element) => {
        if (element.code === 'board') {
          collector.board = _.get(_.orderBy(element.range, ['index'], ['asc']), '[0].name') || '';
        }
        return collector;
      }, {});
    this.dataDrivenFilter.emit(defaultFilters);
  }
  private getFrameWork() {
    const framework = this.cacheService.get('framework' + 'search');
    if (framework) {
      return of(framework);
    } else {
      const formServiceInputParams = {
        formType: 'framework',
        formAction: 'search',
        contentType: 'framework-code',
      };
      return this.formService.getFormConfig(formServiceInputParams, this.hashTagId)
        .pipe(map((data: ServerResponse) => {
            const frameWork = _.find(data, 'framework').framework;
            this.cacheService.set('framework' + 'search', frameWork, { maxAge: this.browserCacheTtlService.browserCacheTtl});
            return frameWork;
        }), catchError((error) => {
          return of(false);
        }));
    }
  }
  private fetchContent() {
    combineLatest(this.activatedRoute.params, this.activatedRoute.queryParams)
    .pipe(map((result) => ({params: result[0], queryParams: result[1]})),
        filter(({queryParams}) => !_.isEqual(this.queryParams, queryParams)), // fetch data if queryParams changed
        mergeMap(({params, queryParams}) => {
          this.queryParams = { ...queryParams };
          return this.fetchPageData();
        }),
        takeUntil(this.unsubscribe$))
      .subscribe(data => {
        this.showLoader = false;
        this.carouselData = this.prepareCarouselData(_.get(data, 'sections'));
        if (this.carouselData.length) {
          this.noResult = false;
        } else {
          this.noResult = true;
        }
      }, err => {
        this.showLoader = false;
        this.noResult = true;
        this.toasterService.error(this.resourceService.messages.fmsg.m0004);
    });
  }
  private prepareCarouselData(sections = []) {
      const carouselData = _.reduce(sections, (collector, element) => {
        const contents = _.get(element, 'contents') || [];
        const { constantData, metaData, dynamicFields } = this.configService.appConfig.CoursePage;
        element.contents = this.utilService.getDataForCard(contents, constantData, dynamicFields, metaData);
        if (element.contents && element.contents.length) {
          collector.push(element);
        }
        return collector;
      }, []);
      return carouselData;
  }
  private fetchPageData() {
    const filters = _.pickBy(this.queryParams, (value: Array<string> | string) => value.length);
    // filters.channel = this.hashTagId;
    // filters.board = _.get(this.queryParams, 'board') || this.prominentFilters.board;
    const option = {
      source: 'web',
      name: 'AnonymousCourse',
      filters: filters,
      // softConstraints: { badgeAssertions: 98, board: 99,  channel: 100 },
      // mode: 'soft',
      // exists: [],
      params : this.configService.appConfig.ExplorePage.contentApiQueryParams
    };
    return this.pageApiService.getPageData(option);
  }
  public prepareVisits(event) {
    _.forEach(event, (inView, index) => {
      if (inView.metaData.identifier) {
        this.inViewLogs.push({
          objid: inView.metaData.identifier,
          objtype: inView.metaData.contentType,
          index: index,
          section: inView.section,
        });
      }
    });
    this.telemetryImpression.edata.visits = this.inViewLogs;
    this.telemetryImpression.edata.subtype = 'pageexit';
    this.telemetryImpression = Object.assign({}, this.telemetryImpression);
  }
  public playContent(event) {
    if (!this.userService.loggedIn && event.data.contentType === 'Course') {
      this.showLoginModal = true;
      this.baseUrl = '/' + 'learn' + '/' + 'course' + '/' + event.data.metaData.identifier;
    } else {
      this.publicPlayerService.playContent(event);
    }
  }
  public viewAll(event) {
    const searchQuery = JSON.parse(event.searchQuery);
    searchQuery.request.filters.defaultSortBy = JSON.stringify(searchQuery.request.sort_by);
    // searchQuery.request.filters.channel = this.hashTagId;
    // searchQuery.request.filters.board = this.prominentFilters.board;
    if (searchQuery.request.filters.c_Sunbird_Dev_open_batch_count) {
      searchQuery.request.filters.c_Sunbird_Dev_open_batch_count =
        JSON.stringify(searchQuery.request.filters.c_Sunbird_Dev_open_batch_count);
    }
    this.cacheService.set('viewAllQuery', searchQuery.request.filters, { maxAge: this.browserCacheTtlService.browserCacheTtl });
    const queryParams = { ...searchQuery.request.filters, ...this.queryParams};
    const sectionUrl = this.router.url.split('?')[0] + '/view-all/' + event.name.replace(/\s/g, '-');
    this.router.navigate([sectionUrl, 1], {queryParams: queryParams});
  }
  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
  private setTelemetryData() {
    this.telemetryImpression = {
      context: {
        env: this.activatedRoute.snapshot.data.telemetry.env
      },
      edata: {
        type: this.activatedRoute.snapshot.data.telemetry.type,
        pageid: this.activatedRoute.snapshot.data.telemetry.pageid,
        uri: this.router.url,
        subtype: this.activatedRoute.snapshot.data.telemetry.subtype
      }
    };
    this.sortIntractEdata = {
      id: 'sort',
      type: 'click',
      pageid: this.activatedRoute.snapshot.data.telemetry.pageid
    };
  }
  private setNoResultMessage() {
    this.noResultMessage = {
      'message': _.get(this.resourceService, 'messages.stmsg.m0007') || 'No results found',
      'messageText': _.get(this.resourceService, 'messages.stmsg.m0006') || 'Please search for something else.'
    };
  }
}

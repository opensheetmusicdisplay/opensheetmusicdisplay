import chai = require("chai");
import spies = require("chai-spies");
chai.use(spies);

import { IEvent, Event } from "../../src/Plugin";


describe("PluginHost's IEvent and actual implementation", () => {

    it("registers handlers", (done: MochaDone) => {
        let event: IEvent<string> = new Event<string>();
        event.on(() => {});
        done();
    });

    it("unregisters handlers", (done: MochaDone) => {
        let event: IEvent<string> = new Event<string>();
        let mockHandler = () => {};
        event.on(mockHandler);
        event.off(mockHandler);
        done();
    });

    it("notifies registered handler when triggered", (done: MochaDone) => {
        let event: Event<string> = new Event<string>();
        let spy = chai.spy();
        event.on(spy);
        event.trigger("mock event");
        chai.expect(spy).to.have.been.called.once();
        chai.expect(spy).to.have.been.called.with("mock event");
        done();
    });

    it("notifies registered handler every time when triggered", (done: MochaDone) => {
        let event: Event<string> = new Event<string>();
        let spy = chai.spy();
        event.on(spy);
        event.trigger("mock event");
        chai.expect(spy).to.have.been.called.once();
        chai.expect(spy).to.have.been.called.with("mock event");
        event.trigger("another mock event");
        event.trigger("again a mock event");
        event.trigger("the fourth mock event");
        chai.expect(spy).to.have.been.called.exactly(4);
        chai.expect(spy).to.have.been.called.with("the fourth mock event");
        done();
    });

    it("notifies all registered handlers when triggered", (done: MochaDone) => {
        let event: Event<string> = new Event<string>();
        let spyOne = chai.spy();
        let spyTwo = chai.spy();
        let spyThree = chai.spy();
        event.on(spyOne);
        event.on(spyTwo);
        event.on(spyThree);
        event.trigger("mock event");
        chai.expect(spyOne).to.have.been.called.once();
        chai.expect(spyOne).to.have.been.called.with("mock event");
        chai.expect(spyTwo).to.have.been.called.once();
        chai.expect(spyTwo).to.have.been.called.with("mock event");
        chai.expect(spyThree).to.have.been.called.once();
        chai.expect(spyThree).to.have.been.called.with("mock event");
        done();
    });

    it("doesn't notify unregistered handlers when triggered", (done: MochaDone) => {
        let event: Event<string> = new Event<string>();
        let spy = chai.spy();
        event.on(spy);
        event.trigger("mock event");
        chai.expect(spy).to.have.been.called.once();
        chai.expect(spy).to.have.been.called.with("mock event");
        event.off(spy);
        event.trigger("mock event");
        chai.expect(spy).to.have.been.called.once();
        done();
    });
});
